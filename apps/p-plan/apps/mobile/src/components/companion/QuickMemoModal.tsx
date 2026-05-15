import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Modal, 
  TouchableOpacity, 
  TextInput, 
  KeyboardAvoidingView, 
  Platform,
  TouchableWithoutFeedback,
  Keyboard
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DESIGN_TOKENS } from '@pplaner/shared';
import { BlurView } from 'expo-blur';

interface QuickMemoModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (text: string) => void;
  initialValue?: string;
  title?: string;
  placeholder?: string;
}

export const QuickMemoModal: React.FC<QuickMemoModalProps> = ({ 
  visible, 
  onClose, 
  onSave,
  initialValue = '',
  title = '빠른 메모',
  placeholder = '지금 이 순간의 기록을 남겨보세요...'
}) => {
  const [memo, setMemo] = useState(initialValue);

  useEffect(() => {
    if (visible) {
      setMemo(initialValue);
    }
  }, [visible, initialValue]);

  const handleSave = () => {
    if (memo.trim()) {
      onSave(memo);
      setMemo('');
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardView}
          >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <View style={styles.modalContent}>
                <View style={styles.header}>
                  <Text style={styles.title}>{title}</Text>
                  <TouchableOpacity onPress={onClose}>
                    <Ionicons name="close" size={24} color={DESIGN_TOKENS.colors.slate[400]} />
                  </TouchableOpacity>
                </View>

                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    placeholder={placeholder}
                    placeholderTextColor={DESIGN_TOKENS.colors.slate[400]}
                    multiline
                    autoFocus
                    value={memo}
                    onChangeText={setMemo}
                    maxLength={500}
                  />
                  <Text style={styles.charCount}>{memo.length}/500</Text>
                </View>

                <View style={styles.footer}>
                  <TouchableOpacity 
                    style={[styles.button, styles.cancelButton]} 
                    onPress={onClose}
                  >
                    <Text style={styles.cancelButtonText}>취소</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.button, styles.saveButton, !memo.trim() && styles.disabledButton]} 
                    onPress={handleSave}
                    disabled={!memo.trim()}
                  >
                    <Text style={styles.saveButtonText}>기록하기</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  keyboardView: {
    width: '100%',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 44 : 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: DESIGN_TOKENS.colors.slate[900],
  },
  inputContainer: {
    backgroundColor: DESIGN_TOKENS.colors.slate[50],
    borderRadius: 20,
    padding: 16,
    minHeight: 120,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  input: {
    fontSize: 16,
    color: DESIGN_TOKENS.colors.slate[800],
    textAlignVertical: 'top',
    height: 100,
  },
  charCount: {
    fontSize: 12,
    color: DESIGN_TOKENS.colors.slate[400],
    textAlign: 'right',
    marginTop: 8,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  button: {
    flex: 1,
    height: 54,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: DESIGN_TOKENS.colors.slate[100],
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.slate[600],
  },
  saveButton: {
    backgroundColor: DESIGN_TOKENS.colors.primary.DEFAULT,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  disabledButton: {
    backgroundColor: DESIGN_TOKENS.colors.slate[200],
  },
});
