import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { C, STATUS } from '../theme';

export function Button({ title, onPress, kind = 'terra', disabled, loading, small, style }) {
  const bg = { terra: C.terra, green: C.green, outline: 'transparent', danger: 'transparent' }[kind];
  const color = kind === 'outline' ? C.green : kind === 'danger' ? C.danger : '#fff';
  const border = kind === 'outline' ? C.green : kind === 'danger' ? C.danger : bg;
  return (
    <Pressable onPress={onPress} disabled={disabled || loading}
      style={({ pressed }) => [s.btn, small && s.btnSmall, { backgroundColor: bg, borderColor: border, opacity: disabled || loading ? 0.5 : pressed ? 0.8 : 1 }, style]}>
      {loading ? <ActivityIndicator color={color} /> : <Text style={[s.btnText, small && { fontSize: 13 }, { color }]}>{title}</Text>}
    </Pressable>
  );
}

export function Field({ label, error, style, ...props }) {
  return (
    <View style={[{ marginBottom: 14 }, style]}>
      {label ? <Text style={s.label}>{label}</Text> : null}
      <TextInput placeholderTextColor="#b0a595" {...props} style={[s.input, props.multiline && { height: 80, textAlignVertical: 'top' }, error && { borderColor: C.danger }]} />
      {error ? <Text style={s.error}>{error}</Text> : null}
    </View>
  );
}

export function Badge({ status }) {
  const [label, bg, fg] = STATUS[status] || [status, '#eee', '#333'];
  return <View style={[s.badge, { backgroundColor: bg }]}><Text style={{ color: fg, fontWeight: '700', fontSize: 12 }}>{label}</Text></View>;
}

export const Card = ({ children, style }) => <View style={[s.card, style]}>{children}</View>;

export function Empty({ icon = '🍽️', title, text }) {
  return (
    <View style={{ alignItems: 'center', padding: 32 }}>
      <Text style={{ fontSize: 44 }}>{icon}</Text>
      <Text style={{ fontSize: 17, fontWeight: '700', color: C.ink, marginTop: 8 }}>{title}</Text>
      {text ? <Text style={{ color: C.muted, textAlign: 'center', marginTop: 4 }}>{text}</Text> : null}
    </View>
  );
}

export function ErrorView({ error, onRetry }) {
  return (
    <View style={{ alignItems: 'center', padding: 32 }}>
      <Text style={{ fontSize: 40 }}>⚠️</Text>
      <Text style={{ color: C.ink, textAlign: 'center', marginVertical: 8 }}>{error.message}</Text>
      {onRetry ? <Button title="Coba lagi" kind="outline" small onPress={onRetry} /> : null}
    </View>
  );
}

export const Loading = () => <ActivityIndicator size="large" color={C.terra} style={{ marginTop: 48 }} />;

export const Screen = ({ children, style }) => <View style={[{ flex: 1, backgroundColor: C.cream }, style]}>{children}</View>;

const s = StyleSheet.create({
  btn: { borderWidth: 1.5, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  btnSmall: { paddingVertical: 7, paddingHorizontal: 12 },
  btnText: { fontWeight: '700', fontSize: 15 },
  label: { color: C.ink, fontWeight: '600', marginBottom: 5 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: C.line, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: C.ink },
  error: { color: C.danger, fontSize: 12, marginTop: 4 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99, alignSelf: 'flex-start' },
  card: { backgroundColor: C.paper, borderWidth: 1, borderColor: C.line, borderRadius: 14, padding: 14, marginBottom: 12 },
});
