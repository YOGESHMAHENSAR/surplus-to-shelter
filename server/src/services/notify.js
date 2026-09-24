import Shelter from '../models/Shelter.js';

let io;
export const setIO = (x) => { io = x; };
export const emitTo = (userId, event, payload) => io?.to(`user:${userId}`).emit(event, payload);

// Push notification (Socket.IO) + optional SMS via Twilio REST
export async function sendSMS(phone, body) {
  if (!phone) return;
  const { TWILIO_SID: sid, TWILIO_TOKEN: tok, TWILIO_FROM: from } = process.env;
  if (!sid || !tok || !from) return console.log(`[SMS -> ${phone}] ${body}`);
  await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: { Authorization: 'Basic ' + Buffer.from(`${sid}:${tok}`).toString('base64'), 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ To: phone, From: from, Body: body }),
  }).catch((e) => console.error('SMS failed', e.message));
}

// Tell donor, shelter owner and driver that a donation changed state.
export async function announce(d) {
  const payload = { id: d._id, itemName: d.itemName, status: d.status, weightKg: d.weightKg };
  const sid = d.match?.shelter?._id || d.match?.shelter;
  const shelter = sid ? await Shelter.findById(sid) : null;
  const targets = [d.donor?._id || d.donor, shelter?.owner, d.driver?._id || d.driver].filter(Boolean);
  targets.forEach((t) => emitTo(t, 'donation:update', payload));
}
