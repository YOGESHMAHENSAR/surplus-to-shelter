import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { api, errMsg, getPosition, toFormData } from '../api.js';

const ROLE_META = {
    donor: {
        title: 'Food Rescue Partner (Donor)',
        icon: '🌱',
        proofLabel: 'Hotel FSSAI Certificate',
        proofHelp: 'FSSAI food safety compliance certification for hotel & restaurant surplus donors.',
        dashboardLink: '/donor',
        dashboardText: 'My Donations',
    },
    shelter: {
        title: 'Shelter & Kitchen Partner',
        icon: '🏠',
        proofLabel: 'Shelter / NGO Certificate',
        proofHelp: 'Government / NGO Darpan / Trust registration proof for community food relief distribution.',
        dashboardLink: '/shelter',
        dashboardText: 'Shelter Hub',
    },
    driver: {
        title: 'Volunteer Transport Driver',
        icon: '🚚',
        proofLabel: 'Driver’s License (DL)',
        proofHelp: 'Official driving license permitting authorized surplus food transport.',
        dashboardLink: '/driver',
        dashboardText: 'Driver Deliveries',
    },
    admin: {
        title: 'System Administrator',
        icon: '🛡️',
        proofLabel: 'System Credentials',
        proofHelp: 'Full administrative access to food matching and dispatch platform.',
        dashboardLink: '/impact',
        dashboardText: 'Impact & Analytics',
    },
};

export default function Profile() {
    const { user, updateMe, toast } = useAuth();
    const [editing, setEditing] = useState(false);
    const [busy, setBusy] = useState(false);
    const [locating, setLocating] = useState(false);
    const [err, setErr] = useState('');
    const [showProofModal, setShowProofModal] = useState(false);
    const [proofPreview, setProofPreview] = useState(null);
    const [previewError, setPreviewError] = useState(false);

    // Form state initialized with user profile values
    const [f, setF] = useState({
        name: '',
        orgName: '',
        phone: '',
        address: '',
        fssaiCert: '',
        ngoCert: '',
        driverLicense: '',
        vehicleCapacityKg: 50,
        isAvailable: false,
        verificationProof: '',
    });
    const [proofFileName, setProofFileName] = useState('');
    const [proofFile, setProofFile] = useState(null);

    useEffect(() => {
        if (!showProofModal || !user?.verificationProof) return;
        let active = true;
        let objectUrl;
        setProofPreview(null);
        setPreviewError(false);
        api.get('/auth/me/documents/verificationProof', { responseType: 'blob' })
            .then(({ data }) => {
                if (!active) return;
                objectUrl = URL.createObjectURL(data);
                setProofPreview({ url: objectUrl, image: data.type.startsWith('image/'), pdf: data.type === 'application/pdf' });
            })
            .catch((error) => { if (active) { toast(errMsg(error)); setShowProofModal(false); } });
        return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
    }, [showProofModal, user?.verificationProof, toast]);

    useEffect(() => {
        if (!editing) { setProofFile(null); setProofFileName(''); }
    }, [editing]);

    useEffect(() => {
        if (user) {
            setF({
                name: user.name || '',
                orgName: user.orgName || '',
                phone: user.phone || '',
                address: user.address || '',
                fssaiCert: user.fssaiCert || '',
                ngoCert: user.ngoCert || '',
                driverLicense: user.driverLicense || '',
                vehicleCapacityKg: user.vehicleCapacityKg || 50,
                isAvailable: Boolean(user.isAvailable),
                verificationProof: user.verificationProof || '',
            });
        }
    }, [user]);

    const meta = ROLE_META[user?.role] || ROLE_META.donor;

    const setField = (key) => (e) => setF({ ...f, [key]: e.target.value });

    const handleFileProof = (e) => {
        const file = e.target.files?.[0];
        setProofFileName(file?.name || '');
        setProofFile(file || null);
    };

    const handleGpsUpdate = async () => {
        setLocating(true);
        setErr('');
        try {
            const pos = await getPosition();
            await updateMe({ location: pos });
            toast(`📍 Location updated to [${pos.lat.toFixed(4)}, ${pos.lng.toFixed(4)}]`);
        } catch (x) {
            setErr(errMsg(x));
        } finally {
            setLocating(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setBusy(true);
        setErr('');
        try {
            const payload = {
                name: f.name,
                orgName: f.orgName,
                phone: f.phone,
                address: f.address,
                vehicleCapacityKg: user.role === 'driver' ? Number(f.vehicleCapacityKg) : undefined,
                fssaiCert: user.role === 'donor' ? f.fssaiCert : undefined,
                ngoCert: user.role === 'shelter' ? f.ngoCert : undefined,
                driverLicense: user.role === 'driver' ? f.driverLicense : undefined,
                verificationProof: proofFile || undefined,
            };
            await updateMe(toFormData(payload));
            toast('✓ Profile details saved successfully');
            setEditing(false);
        } catch (x) {
            setErr(errMsg(x));
        } finally {
            setBusy(false);
        }
    };

    const toggleAvailability = async () => {
        try {
            const next = !user.isAvailable;
            await updateMe({ isAvailable: next });
            toast(next ? '🚚 Marked available for deliveries' : '⏸️ Marked off-duty');
        } catch (x) {
            toast(errMsg(x));
        }
    };

    const getCertValue = () => {
        if (user.role === 'donor') return user.fssaiCert;
        if (user.role === 'shelter') return user.ngoCert;
        if (user.role === 'driver') return user.driverLicense;
        return null;
    };

    const certValue = getCertValue();
    const hasProofDoc = Boolean(user.verificationProof);

    return (
        <main className="page narrow">
            {/* Header Banner */}
            <div className="mission-header">
                <div className="row between">
                    <div>
                        <span className="badge good">
                            {meta.icon} {meta.title}
                        </span>
                        <h1 style={{ marginTop: '8px', marginBottom: '4px' }}>
                            {user.orgName ? `${user.orgName}` : user.name}
                        </h1>
                        <p className="muted">
                            Surplus-to-Shelter Verified Member &bull; Account ID: <code>{user._id}</code>
                        </p>
                    </div>
                    <div className="row">
                        <Link to={meta.dashboardLink} className="ghost btn">
                            &larr; {meta.dashboardText}
                        </Link>
                        {!editing ? (
                            <button className="primary" onClick={() => setEditing(true)}>
                                ✏️ Edit Profile
                            </button>
                        ) : (
                            <button className="ghost" onClick={() => setEditing(false)}>
                                Cancel
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Validation / Compliance Status Card */}
            <section className="card" style={{ borderLeft: '5px solid var(--primary)' }}>
                <div className="row between" style={{ marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '1.4rem' }}>🛡️</span>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '1.18rem' }}>Validation & Compliance Proof</h2>
                            <p className="muted small" style={{ margin: '2px 0 0' }}>
                                {meta.proofHelp}
                            </p>
                        </div>
                    </div>
                    {certValue ? (
                        <span className="badge good">✓ Verified Proof Recorded</span>
                    ) : (
                        <span className="badge warn">⚠️ Proof Pending</span>
                    )}
                </div>

                <div
                    style={{
                        padding: '16px',
                        background: 'var(--bg-subtle)',
                        borderRadius: 'var(--radius-md)',
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                        gap: '16px',
                    }}
                >
                    <div>
                        <span className="muted small" style={{ display: 'block', textTransform: 'uppercase', fontWeight: 700 }}>
                            {meta.proofLabel}
                        </span>
                        <div style={{ marginTop: '4px', fontSize: '1.05rem', fontWeight: 600 }}>
                            {certValue || <span className="muted">Not registered yet</span>}
                        </div>
                    </div>

                    <div>
                        <span className="muted small" style={{ display: 'block', textTransform: 'uppercase', fontWeight: 700 }}>
                            Document Proof Status
                        </span>
                        <div style={{ marginTop: '4px' }}>
                            {hasProofDoc ? (
                                <div className="row">
                                    <span className="badge good">📄 Document Attached</span>
                                    <button
                                        type="button"
                                        className="ghost"
                                        style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                                        onClick={() => setShowProofModal(true)}
                                    >
                                        View Proof
                                    </button>
                                </div>
                            ) : (
                                <span className="muted small">No document file uploaded</span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Proof preview modal */}
                {showProofModal && user.verificationProof && (
                    <div className="modal" onClick={() => setShowProofModal(false)}>
                        <div className="card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '720px', width: '90%', maxHeight: '90vh', overflowY: 'auto' }}>
                            <div className="row between" style={{ marginBottom: '16px' }}>
                                <h3 style={{ margin: 0 }}>🛡️ Attached Verification Document</h3>
                                <button className="ghost" onClick={() => setShowProofModal(false)}>✕</button>
                            </div>
                            {!proofPreview ? <p role="status">Loading document...</p> : (
                                <div style={{ padding: '20px', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
                                    {proofPreview.image && !previewError ? (
                                        <img
                                            src={proofPreview.url}
                                            alt="Verification proof document"
                                            onError={() => setPreviewError(true)}
                                            style={{ display: 'block', width: '100%', maxHeight: '55vh', borderRadius: 'var(--radius-md)', objectFit: 'contain' }}
                                        />
                                    ) : proofPreview.pdf ? (
                                        <object
                                            data={proofPreview.url}
                                            type="application/pdf"
                                            aria-label="Verification proof PDF preview"
                                            style={{ display: 'block', width: '100%', height: '55vh', border: 0, borderRadius: 'var(--radius-md)' }}
                                        >
                                            <p>Your browser cannot preview this PDF. Download the document to view it.</p>
                                        </object>
                                    ) : (
                                        <p role="status">Preview unavailable. Download the document to view it.</p>
                                    )}
                                    <a
                                        href={proofPreview.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        download={user.verificationProof.split('/').pop() || 'verification_proof'}
                                        className="primary btn"
                                        style={{ marginTop: '12px' }}
                                    >
                                        Download Proof Document
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </section>

            {/* Profile Information / Edit Form */}
            {!editing ? (
                <section className="card">
                    <h2 style={{ marginTop: 0, fontSize: '1.2rem', marginBottom: '16px' }}>Account Details</h2>

                    <div className="grid2" style={{ rowGap: '16px' }}>
                        <div>
                            <span className="muted small">Contact Person / Name</span>
                            <div style={{ fontWeight: 600, fontSize: '1rem', marginTop: '2px' }}>{user.name}</div>
                        </div>

                        {user.orgName && (
                            <div>
                                <span className="muted small">
                                    {user.role === 'shelter' ? 'Shelter / Trust Name' : 'Organization / Hotel Name'}
                                </span>
                                <div style={{ fontWeight: 600, fontSize: '1rem', marginTop: '2px' }}>{user.orgName}</div>
                            </div>
                        )}

                        <div>
                            <span className="muted small">Registered Email Address</span>
                            <div style={{ fontWeight: 600, fontSize: '1rem', marginTop: '2px' }}>{user.email}</div>
                        </div>

                        <div>
                            <span className="muted small">Phone Number</span>
                            <div style={{ fontWeight: 600, fontSize: '1rem', marginTop: '2px' }}>
                                {user.phone || <span className="muted">None added</span>}
                            </div>
                        </div>

                        <div>
                            <span className="muted small">Physical Address</span>
                            <div style={{ fontWeight: 600, fontSize: '1rem', marginTop: '2px' }}>
                                {user.address || <span className="muted">None added</span>}
                            </div>
                        </div>

                        <div>
                            <span className="muted small">GPS Coordinates</span>
                            <div style={{ fontWeight: 600, fontSize: '1rem', marginTop: '2px' }}>
                                {user.location?.lat ? (
                                    <span>
                                        📍 {user.location.lat.toFixed(4)}, {user.location.lng.toFixed(4)}
                                    </span>
                                ) : (
                                    <span className="muted">Not configured</span>
                                )}
                            </div>
                        </div>

                        {user.role === 'driver' && (
                            <div>
                                <span className="muted small">Vehicle Rescue Capacity</span>
                                <div style={{ fontWeight: 600, fontSize: '1rem', marginTop: '2px' }}>
                                    🚚 {user.vehicleCapacityKg || 50} kg max load
                                </div>
                            </div>
                        )}

                        {user.role === 'driver' && (
                            <div>
                                <span className="muted small">Driver Duty Status</span>
                                <div style={{ marginTop: '4px' }}>
                                    <button
                                        type="button"
                                        className={user.isAvailable ? 'primary' : 'ghost'}
                                        style={{ padding: '6px 14px', fontSize: '0.88rem' }}
                                        onClick={toggleAvailability}
                                    >
                                        {user.isAvailable ? '🟢 Available for Pickups' : '⚪ Off-Duty'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="row" style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--line)' }}>
                        <button
                            type="button"
                            className="ghost"
                            disabled={locating}
                            onClick={handleGpsUpdate}
                        >
                            {locating ? '📍 Pinpointing GPS…' : '📍 Refresh GPS Location'}
                        </button>
                        <span className="muted small">Click to sync your current GPS position for dispatch routing.</span>
                    </div>
                </section>
            ) : (
                /* Edit Mode */
                <form className="card" onSubmit={handleSave}>
                    <h2 style={{ marginTop: 0, fontSize: '1.2rem', marginBottom: '16px' }}>Edit Profile Information</h2>

                    <div className="grid2">
                        <label>
                            Your Name / Contact Person
                            <input value={f.name} onChange={setField('name')} required placeholder="Full Name" />
                        </label>

                        {user.role !== 'driver' && (
                            <label>
                                {user.role === 'shelter' ? 'Shelter / Trust Name' : 'Hotel / Business Name'}
                                <input
                                    value={f.orgName}
                                    onChange={setField('orgName')}
                                    placeholder="e.g., Grand Hotel or Hope Shelter"
                                />
                            </label>
                        )}

                        <label>
                            Phone Number
                            <input value={f.phone} onChange={setField('phone')} placeholder="+91 98765 43210" />
                        </label>

                        <label>
                            Physical Address
                            <input value={f.address} onChange={setField('address')} placeholder="Street, City, Postal Code" />
                        </label>

                        {user.role === 'donor' && (
                            <label>
                                Hotel FSSAI Certificate / License No.
                                <input
                                    value={f.fssaiCert}
                                    onChange={setField('fssaiCert')}
                                    placeholder="14-digit FSSAI Number"
                                />
                            </label>
                        )}

                        {user.role === 'shelter' && (
                            <label>
                                Shelter / NGO Certificate No.
                                <input
                                    value={f.ngoCert}
                                    onChange={setField('ngoCert')}
                                    placeholder="NGO Darpan / 12A / 80G No."
                                />
                            </label>
                        )}

                        {user.role === 'driver' && (
                            <label>
                                Driver’s License (DL) Number
                                <input
                                    value={f.driverLicense}
                                    onChange={setField('driverLicense')}
                                    placeholder="DL-1420110012345"
                                />
                            </label>
                        )}

                        {user.role === 'driver' && (
                            <label>
                                Vehicle Capacity (kg)
                                <input
                                    type="number"
                                    min="1"
                                    value={f.vehicleCapacityKg}
                                    onChange={setField('vehicleCapacityKg')}
                                />
                            </label>
                        )}

                        <label>
                            Update license Document Proof
                            <input
                                type="file"
                                accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
                                onChange={handleFileProof}
                            />
                        </label>
                    </div>

                    {proofFileName && (
                        <p className="small" style={{ color: 'var(--primary)', marginTop: '4px' }}>
                            ✓ New document selected: <strong>{proofFileName}</strong>
                        </p>
                    )}

                    {err && <p className="err">{err}</p>}

                    <div className="row" style={{ marginTop: '20px' }}>
                        <button className="primary" disabled={busy} type="submit">
                            {busy ? 'Saving Changes…' : 'Save Changes'}
                        </button>
                        <button type="button" className="ghost" onClick={() => setEditing(false)}>
                            Cancel
                        </button>
                    </div>
                </form>
            )}

            {/* Quick Actions / Role Guide */}
            <div
                style={{
                    padding: '16px 20px',
                    background: 'var(--bg-subtle)',
                    borderRadius: 'var(--radius-lg)',
                    marginTop: '20px',
                    border: '1px solid var(--line)',
                }}
            >
                <h3 style={{ margin: '0 0 6px', fontSize: '1rem' }}>🛡️ Food Safety & Legal Assurance</h3>
                <p className="muted small" style={{ margin: 0, lineHeight: 1.5 }}>
                    Surplus-to-Shelter maintains verified certificates (FSSAI, NGO registrations, and Driver’s Licenses)
                    to ensure compliance with food safety regulations, Good Samaritan relief protections, and transparent logistics.
                </p>
            </div>
        </main>
    );
}
