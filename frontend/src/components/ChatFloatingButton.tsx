import React, { useState, useRef } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    Modal, FlatList, KeyboardAvoidingView, Platform,
    ActivityIndicator, Animated
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import api from '../services/api';

interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    text: string;
    timestamp: Date;
}

const QUICK_QUESTIONS = [
    'Genel durum nasıl?',
    'Kritik bekleyen arıza var mı?',
    'Bu ay kaç arıza var?',
    'Teknisyen iş yükü nedir?',
];

export function ChatFloatingButton() {
    const [open, setOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            id: '0',
            role: 'assistant',
            text: '👋 Merhaba! Ben arıza takip asistanınım. Arızalar, iş emirleri ve teknisyenler hakkında sorularınızı yanıtlayabilirim.',
            timestamp: new Date(),
        }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const flatListRef = useRef<FlatList>(null);
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const handleOpen = () => {
        Animated.sequence([
            Animated.timing(scaleAnim, { toValue: 0.85, duration: 100, useNativeDriver: true }),
            Animated.timing(scaleAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
        ]).start();
        setOpen(true);
    };

    const sendMessage = async (text?: string) => {
        const messageText = (text || input).trim();
        if (!messageText) return;

        const userMsg: ChatMessage = {
            id: Date.now().toString(),
            role: 'user',
            text: messageText,
            timestamp: new Date(),
        };

        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setLoading(true);

        // Scroll to bottom
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

        try {
            const res = await api.post('/ai/chat', { message: messageText });
            const assistantMsg: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                text: res.data.reply,
                timestamp: new Date(),
            };
            setMessages(prev => [...prev, assistantMsg]);
        } catch (error: any) {
            const errMsg: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                text: '❌ Bir hata oluştu. Lütfen tekrar deneyin.',
                timestamp: new Date(),
            };
            setMessages(prev => [...prev, errMsg]);
        } finally {
            setLoading(false);
            setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
        }
    };

    const renderMessage = ({ item }: { item: ChatMessage }) => {
        const isUser = item.role === 'user';
        return (
            <View style={[styles.msgRow, isUser ? styles.msgRowUser : styles.msgRowAssistant]}>
                {!isUser && (
                    <View style={styles.avatarBot}>
                        <Text style={styles.avatarBotText}>🤖</Text>
                    </View>
                )}
                <View style={[styles.msgBubble, isUser ? styles.msgBubbleUser : styles.msgBubbleAssistant]}>
                    <Text style={[styles.msgText, isUser ? styles.msgTextUser : styles.msgTextAssistant]}>
                        {item.text}
                    </Text>
                </View>
            </View>
        );
    };

    return (
        <>
            {/* Floating Action Button */}
            <Animated.View style={[styles.fabWrapper, { transform: [{ scale: scaleAnim }] }]}>
                <TouchableOpacity style={styles.fab} onPress={handleOpen} activeOpacity={0.85}>
                    <Text style={styles.fabIcon}>🤖</Text>
                </TouchableOpacity>
                {!open && (
                    <View style={styles.fabPulse} />
                )}
            </Animated.View>

            {/* Chat Modal */}
            <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
                <View style={styles.overlay}>
                    <KeyboardAvoidingView
                        style={styles.chatContainer}
                        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    >
                        {/* Header */}
                        <View style={styles.chatHeader}>
                            <View style={styles.chatHeaderLeft}>
                                <Text style={styles.chatHeaderIcon}>🤖</Text>
                                <View>
                                    <Text style={styles.chatHeaderTitle}>AI Asistan</Text>
                                    <Text style={styles.chatHeaderSub}>Arıza Takip Sistemi</Text>
                                </View>
                            </View>
                            <TouchableOpacity onPress={() => setOpen(false)} style={styles.closeBtn}>
                                <Ionicons name="close" size={22} color="#64748B" />
                            </TouchableOpacity>
                        </View>

                        {/* Hızlı sorular */}
                        <View style={styles.quickRow}>
                            {QUICK_QUESTIONS.map(q => (
                                <TouchableOpacity
                                    key={q}
                                    style={styles.quickChip}
                                    onPress={() => sendMessage(q)}
                                    disabled={loading}
                                >
                                    <Text style={styles.quickChipText}>{q}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Mesajlar */}
                        <FlatList
                            ref={flatListRef}
                            data={messages}
                            keyExtractor={item => item.id}
                            renderItem={renderMessage}
                            contentContainerStyle={styles.messageList}
                            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                        />

                        {/* Yazıyor göstergesi */}
                        {loading && (
                            <View style={styles.typingRow}>
                                <View style={styles.avatarBot}>
                                    <Text style={styles.avatarBotText}>🤖</Text>
                                </View>
                                <View style={styles.typingBubble}>
                                    <ActivityIndicator size="small" color="#6366F1" />
                                    <Text style={styles.typingText}>Yanıt hazırlanıyor...</Text>
                                </View>
                            </View>
                        )}

                        {/* Input alanı */}
                        <View style={styles.inputArea}>
                            <TextInput
                                style={styles.chatInput}
                                placeholder="Soru sorun..."
                                placeholderTextColor="#94A3B8"
                                value={input}
                                onChangeText={setInput}
                                onSubmitEditing={() => sendMessage()}
                                returnKeyType="send"
                                editable={!loading}
                                multiline
                            />
                            <TouchableOpacity
                                style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}
                                onPress={() => sendMessage()}
                                disabled={!input.trim() || loading}
                            >
                                <Ionicons name="send" size={20} color="#fff" />
                            </TouchableOpacity>
                        </View>
                    </KeyboardAvoidingView>
                </View>
            </Modal>
        </>
    );
}

const styles = StyleSheet.create({
    // FAB
    fabWrapper: { position: 'absolute', right: 20, bottom: 90, zIndex: 999 },
    fab: {
        width: 56, height: 56, borderRadius: 28,
        backgroundColor: '#6366F1',
        justifyContent: 'center', alignItems: 'center',
        elevation: 8, shadowColor: '#6366F1', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35, shadowRadius: 10
    },
    fabIcon: { fontSize: 26 },
    fabPulse: {
        position: 'absolute', top: -4, right: -4,
        width: 16, height: 16, borderRadius: 8,
        backgroundColor: '#EF4444', borderWidth: 2, borderColor: '#fff'
    },

    // Modal overlay
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
    chatContainer: {
        backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28,
        height: '80%', paddingBottom: Platform.OS === 'ios' ? 30 : 16
    },

    // Chat header
    chatHeader: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        padding: 20, borderBottomWidth: 1, borderBottomColor: '#F1F5F9'
    },
    chatHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    chatHeaderIcon: { fontSize: 32 },
    chatHeaderTitle: { fontSize: 17, fontWeight: '800', color: '#1E293B' },
    chatHeaderSub: { fontSize: 12, color: '#94A3B8', marginTop: 1 },
    closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },

    // Hızlı sorular
    quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
    quickChip: { backgroundColor: '#EEF2FF', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
    quickChipText: { fontSize: 11, fontWeight: '600', color: '#6366F1' },

    // Mesajlar
    messageList: { padding: 16, paddingBottom: 8 },
    msgRow: { marginBottom: 12, flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
    msgRowUser: { justifyContent: 'flex-end' },
    msgRowAssistant: { justifyContent: 'flex-start' },
    avatarBot: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center' },
    avatarBotText: { fontSize: 16 },
    msgBubble: { maxWidth: '78%', borderRadius: 18, padding: 12 },
    msgBubbleUser: { backgroundColor: '#6366F1', borderBottomRightRadius: 4 },
    msgBubbleAssistant: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderBottomLeftRadius: 4 },
    msgText: { fontSize: 14, lineHeight: 20 },
    msgTextUser: { color: '#fff' },
    msgTextAssistant: { color: '#1E293B' },

    // Typing indicator
    typingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingBottom: 8 },
    typingBubble: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10 },
    typingText: { fontSize: 13, color: '#64748B' },

    // Input
    inputArea: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9', gap: 10 },
    chatInput: { flex: 1, minHeight: 44, maxHeight: 100, backgroundColor: '#F8FAFC', borderRadius: 22, borderWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, color: '#1E293B' },
    sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#6366F1', justifyContent: 'center', alignItems: 'center' },
    sendBtnDisabled: { backgroundColor: '#CBD5E1' },
});
