import React, { useEffect, useState } from 'react';
import { Alert, Image, ScrollView, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { errText, food } from '../api/client';
import { Button, Field, Screen } from '../components/ui';
import { C, textToIso, toLocalText } from '../theme';

export default function FoodFormScreen({ route, navigation }) {
  const editing = route.params?.food || null;
  const t0 = new Date(Date.now() + 3600e3);
  const [cats, setCats] = useState([]);
  const [f, setF] = useState({
    title: editing?.title || '', description: editing?.description || '', category_id: editing?.category?.id || null,
    quantity_total: editing ? String(editing.quantity_total) : '', unit: editing?.unit || 'porsi',
    max_per_request: editing?.max_per_request ? String(editing.max_per_request) : '', pickup_location: editing?.pickup_location || '',
    pickup_start: toLocalText(editing ? new Date(editing.pickup_start) : t0),
    pickup_end: toLocalText(editing ? new Date(editing.pickup_end) : new Date(t0.getTime() + 2 * 3600e3)),
    expires_at: toLocalText(editing ? new Date(editing.expires_at) : new Date(t0.getTime() + 4 * 3600e3)),
    allergens: editing?.allergens || '', storage_info: editing?.storage_info || '',
  });
  const [photo, setPhoto] = useState(null);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const set = (k) => (v) => setF((o) => ({ ...o, [k]: v }));
  const err = (k) => (errors[k] ? [].concat(errors[k]).join(' ') : undefined);

  useEffect(() => {
    navigation.setOptions({ title: editing ? 'Ubah makanan' : 'Bagikan makanan' });
    food('GET', '/categories').then((r) => { setCats(r.data); setF((o) => ({ ...o, category_id: o.category_id || r.data[0]?.id })); }).catch(() => {});
  }, []); // eslint-disable-line

  async function pick() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('Izin diperlukan', 'Izinkan akses galeri untuk memilih foto.'); return; }
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.6 });
    if (!r.canceled) setPhoto(r.assets[0]);
  }

  async function submit() {
    const e = {};
    const ps = textToIso(f.pickup_start), pe = textToIso(f.pickup_end), ea = textToIso(f.expires_at);
    if (f.title.trim().length < 3) e.title = 'Minimal 3 karakter.';
    if (!Number.isInteger(Number(f.quantity_total)) || Number(f.quantity_total) < 1) e.quantity_total = 'Angka 1-1000.';
    if (f.pickup_location.trim().length < 5) e.pickup_location = 'Minimal 5 karakter.';
    if (!ps) e.pickup_start = 'Format: 2026-10-12 14:30'; if (!pe) e.pickup_end = 'Format: 2026-10-12 14:30'; if (!ea) e.expires_at = 'Format: 2026-10-12 14:30';
    setErrors(e);
    if (Object.keys(e).length) return;
    const body = {
      title: f.title.trim(), description: f.description || null, category_id: f.category_id, quantity_total: Number(f.quantity_total),
      unit: f.unit || 'porsi', pickup_location: f.pickup_location.trim(), pickup_start: ps, pickup_end: pe, expires_at: ea,
      allergens: f.allergens || null, storage_info: f.storage_info || null,
    };
    if (f.max_per_request) body.max_per_request = Number(f.max_per_request); else if (editing) body.max_per_request = null;
    setBusy(true);
    try {
      const saved = editing ? await food('PATCH', `/foods/${editing.id}`, { body }) : await food('POST', '/foods', { body });
      if (photo) {
        const fd = new FormData();
        fd.append('image', { uri: photo.uri, name: photo.fileName || 'foto.jpg', type: photo.mimeType || 'image/jpeg' });
        try { await food('POST', `/foods/${saved.data.id}/image`, { form: fd }); } catch (ie) { Alert.alert('Foto gagal diunggah', errText(ie)); }
      }
      navigation.goBack();
    } catch (er) { if (er.status === 422 && er.details) setErrors(er.details); Alert.alert('Gagal menyimpan', errText(er)); setBusy(false); }
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
        <Field label="Nama makanan" value={f.title} onChangeText={set('title')} error={err('title')} />
        <Text style={{ fontWeight: '600', marginBottom: 6 }}>Kategori</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
          {cats.map((c) => <Button key={c.id} small title={c.name} kind={f.category_id === c.id ? 'green' : 'outline'} onPress={() => set('category_id')(c.id)} />)}
        </View>
        {err('category_id') ? <Text style={{ color: C.danger, marginBottom: 8 }}>{err('category_id')}</Text> : null}
        <Field label="Deskripsi" value={f.description} onChangeText={set('description')} multiline />
        <Field label="Jumlah" value={f.quantity_total} onChangeText={set('quantity_total')} keyboardType="number-pad" error={err('quantity_total')} />
        <Field label="Satuan" value={f.unit} onChangeText={set('unit')} />
        <Field label="Maks. per permintaan (opsional)" value={f.max_per_request} onChangeText={set('max_per_request')} keyboardType="number-pad" error={err('max_per_request')} />
        <Field label="Lokasi pengambilan" value={f.pickup_location} onChangeText={set('pickup_location')} error={err('pickup_location')} />
        <Field label="Mulai diambil (YYYY-MM-DD HH:mm)" value={f.pickup_start} onChangeText={set('pickup_start')} error={err('pickup_start')} />
        <Field label="Selesai diambil" value={f.pickup_end} onChangeText={set('pickup_end')} error={err('pickup_end')} />
        <Field label="Batas konsumsi" value={f.expires_at} onChangeText={set('expires_at')} error={err('expires_at')} />
        <Field label="Alergen (opsional)" value={f.allergens} onChangeText={set('allergens')} />
        <Field label="Cara penyimpanan (opsional)" value={f.storage_info} onChangeText={set('storage_info')} />
        {photo ? <Image source={{ uri: photo.uri }} style={{ height: 160, borderRadius: 12, marginBottom: 10 }} /> : null}
        <Button title={photo ? 'Ganti foto' : 'Pilih foto (opsional)'} kind="outline" onPress={pick} style={{ marginBottom: 12 }} />
        <Button title="Simpan" onPress={submit} loading={busy} />
      </ScrollView>
    </Screen>
  );
}
