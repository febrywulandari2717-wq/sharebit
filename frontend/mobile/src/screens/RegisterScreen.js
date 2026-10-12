import React, { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { Button, Field } from '../components/ui';
import { errText } from '../api/client';
import { C } from '../theme';

export default function RegisterScreen() {
  const { register } = useAuth();
  const [f, setF] = useState({ role: 'recipient', name: '', email: '', password: '', password_confirmation: '', phone: '' });
  const [errors, setErrors] = useState({});
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (v) => setF((o) => ({ ...o, [k]: v }));
  const err = (k) => (errors[k] ? [].concat(errors[k]).join(' ') : undefined);

  async function submit() {
    const local = {};
    if (f.name.trim().length < 3) local.name = 'Minimal 3 karakter.';
    if (!/^\S+@\S+\.\S+$/.test(f.email.trim())) local.email = 'Email tidak valid.';
    if (f.password.length < 8 || !/[A-Za-z]/.test(f.password) || !/[0-9]/.test(f.password)) local.password = 'Minimal 8 karakter, ada huruf dan angka.';
    if (f.password !== f.password_confirmation) local.password_confirmation = 'Konfirmasi tidak cocok.';
    if (f.phone && !/^[0-9]{8,15}$/.test(f.phone)) local.phone = 'Harus 8-15 digit angka.';
    setErrors(local); setMsg('');
    if (Object.keys(local).length) return;
    setBusy(true);
    try {
      const body = { ...f, name: f.name.trim(), email: f.email.trim() };
      if (!body.phone) delete body.phone;
      await register(body);
    } catch (e) { if (e.status === 422 && e.details) setErrors(e.details); setMsg(errText(e)); setBusy(false); }
  }

  const Role = ({ value, label }) => (
    <Button title={label} kind={f.role === value ? 'green' : 'outline'} small onPress={() => set('role')(value)} style={{ flex: 1 }} />
  );
  return (
    <ScrollView style={{ backgroundColor: C.cream }} contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
      <Text style={{ fontWeight: '600', marginBottom: 6 }}>Saya ingin</Text>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}><Role value="recipient" label="Mencari makanan" /><Role value="donor" label="Membagikan makanan" /></View>
      <Field label="Nama lengkap" value={f.name} onChangeText={set('name')} error={err('name')} />
      <Field label="Email" value={f.email} onChangeText={set('email')} autoCapitalize="none" keyboardType="email-address" error={err('email')} />
      <Field label="Password" value={f.password} onChangeText={set('password')} secureTextEntry error={err('password')} />
      <Field label="Ulangi password" value={f.password_confirmation} onChangeText={set('password_confirmation')} secureTextEntry error={err('password_confirmation')} />
      <Field label="No. telepon (opsional)" value={f.phone} onChangeText={set('phone')} keyboardType="phone-pad" error={err('phone')} />
      {msg ? <Text style={{ color: C.danger, marginBottom: 12 }}>{msg}</Text> : null}
      <Button title="Daftar" onPress={submit} loading={busy} />
    </ScrollView>
  );
}
