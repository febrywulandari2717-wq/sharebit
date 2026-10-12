import React, { useState } from 'react';
import { ScrollView, Text } from 'react-native';
import { donation, errText } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Button, Card, Field, Screen } from '../components/ui';
import { C } from '../theme';

const ROLE = { donor: 'Donor', recipient: 'Penerima', admin: 'Admin' };

export default function ProfileScreen() {
  const { user, logout, updateUser } = useAuth();
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone || '');
  const [address, setAddress] = useState(user.address || '');
  const [cur, setCur] = useState('');
  const [neu, setNeu] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true); setMsg('');
    try {
      const body = { name, phone: phone || null, address: address || null };
      if (neu) { body.current_password = cur; body.new_password = neu; }
      const r = await donation('PATCH', '/auth/me', { body });
      await updateUser(r.data); setCur(''); setNeu(''); setMsg('Profil tersimpan.');
    } catch (e) { setMsg(errText(e)); }
    setBusy(false);
  }
  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
        <Card><Text style={{ color: C.muted }}>{user.email}</Text><Text style={{ fontWeight: '800', color: C.green }}>{ROLE[user.role]}</Text></Card>
        <Field label="Nama" value={name} onChangeText={setName} />
        <Field label="No. telepon" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        <Field label="Alamat" value={address} onChangeText={setAddress} />
        <Text style={{ fontWeight: '800', marginVertical: 8, color: C.ink }}>Ganti password (opsional)</Text>
        <Field label="Password lama" value={cur} onChangeText={setCur} secureTextEntry />
        <Field label="Password baru" value={neu} onChangeText={setNeu} secureTextEntry />
        {msg ? <Text style={{ marginBottom: 12, color: msg === 'Profil tersimpan.' ? C.green : C.danger }}>{msg}</Text> : null}
        <Button title="Simpan" onPress={save} loading={busy} />
        <Button title="Keluar" kind="danger" onPress={logout} style={{ marginTop: 12 }} />
      </ScrollView>
    </Screen>
  );
}
