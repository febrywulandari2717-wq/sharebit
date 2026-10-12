import React, { useEffect, useState } from 'react';
import { Modal, Text, View } from 'react-native';
import { Button, Field } from './ui';
import { C } from '../theme';

/** Dialog isian alasan (Alert.prompt hanya ada di iOS, jadi dibuat sendiri). */
export default function ReasonModal({ visible, title, onCancel, onSubmit }) {
  const [text, setText] = useState('');
  useEffect(() => { if (visible) setText(''); }, [visible]);
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,.45)', justifyContent: 'center', padding: 24 }}>
        <View style={{ backgroundColor: C.paper, borderRadius: 14, padding: 18 }}>
          <Text style={{ fontWeight: '800', fontSize: 17, color: C.ink, marginBottom: 10 }}>{title}</Text>
          <Field value={text} onChangeText={setText} placeholder="Tulis alasan (min. 3 karakter)" multiline maxLength={255} />
          <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'flex-end' }}>
            <Button title="Batal" kind="outline" small onPress={onCancel} />
            <Button title="Kirim" small disabled={text.trim().length < 3} onPress={() => onSubmit(text.trim())} />
          </View>
        </View>
      </View>
    </Modal>
  );
}
