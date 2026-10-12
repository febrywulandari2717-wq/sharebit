import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { Button, Field } from '../components/ui';
import { errText } from '../api/client';
import { C } from '../theme';

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!email.trim() || !password) { setError('Email dan password wajib diisi.'); return; }
    setBusy(true); setError('');
    try { await login(email.trim(), password); } catch (e) { setError(errText(e)); setBusy(false); }
  }
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.cream }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }} keyboardShouldPersistTaps="handled">
        <Text style={{ fontSize: 38, fontWeight: '800', color: C.green }}>Share<Text style={{ color: C.terra }}>Bite</Text></Text>
        <Text style={{ color: C.muted, marginBottom: 28 }}>Makanan lebih, tidak terbuang.</Text>
        <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
        <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="password" />
        {error ? <Text style={{ color: C.danger, marginBottom: 12 }}>{error}</Text> : null}
        <Button title="Masuk" onPress={submit} loading={busy} />
        <View style={{ height: 12 }} />
        <Button title="Belum punya akun? Daftar" kind="outline" onPress={() => navigation.navigate('Register')} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
