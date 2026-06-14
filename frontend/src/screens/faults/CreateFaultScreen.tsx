import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { useNavigation } from '@react-navigation/native';
import { Picker } from '@react-native-picker/picker';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Toast from 'react-native-toast-message';
import api from '../../services/api';

interface Asset { id: number; name: string; }
interface Department { id: number; name: string; }
interface AiSuggestion { suggestedPriority: string; reason: string; }

const PRIORITY_OPTIONS = [
    { id: 0, label: 'Düşük', apiValue: 'Low', color: '#10B981' },
    { id: 1, label: 'Orta', apiValue: 'Normal', color: '#3B82F6' },
    { id: 2, label: 'Yüksek', apiValue: 'High', color: '#F59E0B' },
    { id: 3, label: 'Kritik', apiValue: 'Critical', color: '#EF4444' },
];

const PRIORITY_ID_MAP: Record<string, number> = {
    Low: 0, Normal: 1, High: 2, Critical: 3
};

export function CreateFaultScreen() {
    const { control, handleSubmit, formState: { errors }, watch, setValue } = useForm({
        defaultValues: {
            departmentId: '',
            assetId: '',
            title: '',
            description: '',
            priority: 1,
        }
    });

    const [loading, setLoading] = useState(false);
    const [assets, setAssets] = useState<Asset[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [fetchingData, setFetchingData] = useState(true);

    // AI Özellik 1: Öncelik önerisi state
    const [aiSuggestion, setAiSuggestion] = useState<AiSuggestion | null>(null);
    const [analyzingPriority, setAnalyzingPriority] = useState(false);
    const [priorityFromAI, setPriorityFromAI] = useState(false);

    // AI Özellik 2-C: Açıklama iyileştirici state
    const [improvingDescription, setImprovingDescription] = useState(false);

    const navigation = useNavigation();
    const titleValue = watch('title');
    const descriptionValue = watch('description');

    useEffect(() => { fetchInitialData(); }, []);

    const fetchInitialData = async () => {
        try {
            setFetchingData(true);
            const [assetsRes, departmentsRes] = await Promise.all([
                api.get('/assets').catch(() => ({ data: [] })),
                api.get('/departments').catch(() => ({ data: [] }))
            ]);
            setAssets(assetsRes.data);
            setDepartments(departmentsRes.data);
        } catch {
            Toast.show({ type: 'error', text1: 'Veriler yüklenemedi' });
        } finally {
            setFetchingData(false);
        }
    };

    // ── Özellik 1: AI Öncelik Analizi ─────────────────────────────────────────
    const handleAnalyzePriority = async () => {
        if (!titleValue && !descriptionValue) {
            Toast.show({ type: 'info', text1: 'Önce başlık veya açıklama yazın' });
            return;
        }
        try {
            setAnalyzingPriority(true);
            const res = await api.post('/ai/suggest-priority', {
                title: titleValue || '',
                description: descriptionValue || '',
            });
            const suggestion: AiSuggestion = res.data;
            setAiSuggestion(suggestion);

            // Öneriyi forma otomatik uygula
            const priorityId = PRIORITY_ID_MAP[suggestion.suggestedPriority] ?? 1;
            setValue('priority', priorityId);
            setPriorityFromAI(true);

            Toast.show({
                type: 'info',
                text1: `🤖 AI Önerisi: ${PRIORITY_OPTIONS[priorityId].label}`,
                text2: suggestion.reason,
            });
        } catch {
            Toast.show({ type: 'error', text1: 'Analiz başarısız' });
        } finally {
            setAnalyzingPriority(false);
        }
    };

    // ── Özellik 2-C: Açıklama İyileştir ───────────────────────────────────────
    const handleImproveDescription = async () => {
        if (!descriptionValue || descriptionValue.length < 4) {
            Toast.show({ type: 'info', text1: 'Önce bir açıklama yazın' });
            return;
        }
        try {
            setImprovingDescription(true);
            const res = await api.post('/ai/improve-description', { text: descriptionValue });
            setValue('description', res.data.improved);
            Toast.show({ type: 'success', text1: '✨ Açıklama iyileştirildi' });
        } catch {
            Toast.show({ type: 'error', text1: 'İyileştirme başarısız' });
        } finally {
            setImprovingDescription(false);
        }
    };

    const onSubmit = async (data: any) => {
        if (!data.assetId) {
            Toast.show({ type: 'info', text1: 'Lütfen bir cihaz seçin' });
            return;
        }
        try {
            setLoading(true);
            const selectedOption = PRIORITY_OPTIONS[data.priority];
            await api.post('/faultreports', {
                assetId: Number(data.assetId),
                departmentId: data.departmentId ? Number(data.departmentId) : null,
                title: data.title,
                description: data.description,
                priority: selectedOption.apiValue,
                photoUrls: null,
                priorityFromAI,
            });
            Toast.show({ type: 'success', text1: 'Arıza kaydı oluşturuldu' });
            navigation.goBack();
        } catch (error: any) {
            Toast.show({
                type: 'error',
                text1: 'Hata Oluştu',
                text2: error.response?.data?.message || 'Bilgileri kontrol ediniz.',
            });
        } finally {
            setLoading(false);
        }
    };

    if (fetchingData) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#6366F1" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                    <Ionicons name="chevron-back" size={28} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Yeni Arıza Bildirimi</Text>
                <View style={{ width: 44 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.card}>
                    <View style={styles.headerRow}>
                        <Ionicons name="alert-circle" size={32} color="#EF4444" />
                        <View style={styles.headerText}>
                            <Text style={styles.cardTitle}>Yeni Arıza Bildirimi</Text>
                            <Text style={styles.cardSubtitle}>Arızayı detaylı şekilde aşağıda bildirin.</Text>
                        </View>
                    </View>

                    {/* Cihaz Seçimi */}
                    <View style={styles.formGroup}>
                        <Text style={styles.formLabel}>Cihaz Seçimi *</Text>
                        <View style={styles.pickerContainer}>
                            <Controller
                                control={control}
                                name="assetId"
                                rules={{ required: 'Cihaz seçimi zorunludur' }}
                                render={({ field: { onChange, value } }) => (
                                    <Picker selectedValue={value} onValueChange={onChange} style={styles.picker}>
                                        <Picker.Item label="Cihaz Seç..." value="" color="#94A3B8" />
                                        {assets.map(asset => (
                                            <Picker.Item key={asset.id} label={asset.name} value={asset.id.toString()} />
                                        ))}
                                    </Picker>
                                )}
                            />
                        </View>
                        {errors.assetId && <Text style={styles.errorText}>Cihaz seçimi zorunludur</Text>}
                    </View>

                    {/* Arıza Başlığı */}
                    <View style={styles.formGroup}>
                        <Text style={styles.formLabel}>Arıza Başlığı *</Text>
                        <Controller
                            control={control}
                            name="title"
                            rules={{ required: 'Başlık zorunludur' }}
                            render={({ field: { onChange, onBlur, value } }) => (
                                <View style={[styles.inputWrapper, errors.title && styles.inputWrapperError]}>
                                    <Ionicons name="create-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
                                    <TextInput
                                        style={styles.formInput}
                                        placeholder="Örn: Motor aşırı ısınıyor"
                                        placeholderTextColor="#CBD5E1"
                                        onBlur={onBlur}
                                        onChangeText={onChange}
                                        value={value}
                                    />
                                </View>
                            )}
                        />
                    </View>

                    {/* Açıklama */}
                    <View style={styles.formGroup}>
                        <View style={styles.labelRow}>
                            <Text style={styles.formLabel}>Açıklama *</Text>
                            {/* Özellik 2-C: Geliştir Butonu */}
                            <TouchableOpacity
                                style={styles.improveBtn}
                                onPress={handleImproveDescription}
                                disabled={improvingDescription}
                            >
                                {improvingDescription
                                    ? <ActivityIndicator size={12} color="#6366F1" />
                                    : <Text style={styles.improveBtnText}>✨ Geliştir</Text>
                                }
                            </TouchableOpacity>
                        </View>
                        <Controller
                            control={control}
                            name="description"
                            rules={{ required: 'Açıklama zorunludur' }}
                            render={({ field: { onChange, onBlur, value } }) => (
                                <View style={[styles.inputWrapper, styles.textAreaWrapper, errors.description && styles.inputWrapperError]}>
                                    <TextInput
                                        style={styles.textArea}
                                        placeholder="Arızanın nasıl oluştuğunu ve detaylarını yazın..."
                                        placeholderTextColor="#CBD5E1"
                                        onBlur={onBlur}
                                        onChangeText={onChange}
                                        value={value}
                                        multiline
                                        numberOfLines={4}
                                    />
                                </View>
                            )}
                        />
                    </View>

                    {/* Özellik 1: AI Analiz Butonu */}
                    <TouchableOpacity
                        style={styles.analyzeBtn}
                        onPress={handleAnalyzePriority}
                        disabled={analyzingPriority}
                    >
                        {analyzingPriority ? (
                            <ActivityIndicator size="small" color="#6366F1" />
                        ) : (
                            <>
                                <Ionicons name="sparkles" size={16} color="#6366F1" />
                                <Text style={styles.analyzeBtnText}>🤖 AI ile Öncelik Analiz Et</Text>
                            </>
                        )}
                    </TouchableOpacity>

                    {/* Özellik 1: AI Önerisi Banner */}
                    {aiSuggestion && (
                        <View style={styles.suggestionBanner}>
                            <View style={styles.suggestionHeader}>
                                <Text style={styles.suggestionTitle}>🤖 AI Önerisi</Text>
                                <TouchableOpacity onPress={() => setAiSuggestion(null)}>
                                    <Ionicons name="close-circle" size={18} color="#6366F1" />
                                </TouchableOpacity>
                            </View>
                            <Text style={styles.suggestionPriority}>
                                Öncelik: {PRIORITY_OPTIONS[PRIORITY_ID_MAP[aiSuggestion.suggestedPriority] ?? 1]?.label}
                            </Text>
                            <Text style={styles.suggestionReason}>{aiSuggestion.reason}</Text>
                            <Text style={styles.suggestionHint}>Farklı bir öncelik seçerek override edebilirsiniz.</Text>
                        </View>
                    )}

                    {/* Öncelik Seçimi */}
                    <View style={styles.formGroup}>
                        <Text style={styles.formLabel}>Öncelik Durumu</Text>
                        <Controller
                            control={control}
                            name="priority"
                            render={({ field: { onChange, value } }) => (
                                <View style={styles.priorityRow}>
                                    {PRIORITY_OPTIONS.map(p => (
                                        <TouchableOpacity
                                            key={p.id}
                                            style={[
                                                styles.priorityBtn,
                                                value === p.id && { backgroundColor: p.color, borderColor: p.color }
                                            ]}
                                            onPress={() => {
                                                onChange(p.id);
                                                // Kullanıcı farklı seçerse AI bayrağını kaldır
                                                if (aiSuggestion && PRIORITY_ID_MAP[aiSuggestion.suggestedPriority] !== p.id) {
                                                    setPriorityFromAI(false);
                                                }
                                            }}
                                        >
                                            <Text style={[styles.priorityBtnText, value === p.id && { color: '#fff' }]}>
                                                {p.label}
                                            </Text>
                                            {/* AI önerisiyle aynıysa işaret */}
                                            {aiSuggestion && PRIORITY_ID_MAP[aiSuggestion.suggestedPriority] === p.id && (
                                                <Text style={{ fontSize: 8, color: value === p.id ? '#fff' : '#6366F1' }}> 🤖</Text>
                                            )}
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}
                        />
                    </View>

                    <TouchableOpacity
                        style={[styles.saveBtn, (loading || assets.length === 0) && styles.saveBtnDisabled]}
                        onPress={handleSubmit(onSubmit)}
                        disabled={loading || assets.length === 0}
                    >
                        {loading ? <ActivityIndicator color="#fff" /> : (
                            <>
                                <Ionicons name="paper-plane" size={20} color="#fff" style={{ marginRight: 8 }} />
                                <Text style={styles.saveBtnText}>Arıza Bildirimini Gönder</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F1F5F9' },
    header: { backgroundColor: '#6366F1', paddingTop: 52, paddingBottom: 20, paddingHorizontal: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    backBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },
    content: { padding: 20, paddingBottom: 40 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    card: { backgroundColor: '#fff', borderRadius: 24, padding: 24, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12 },
    headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 28, gap: 12 },
    headerText: { flex: 1 },
    cardTitle: { fontSize: 20, fontWeight: '800', color: '#1E293B' },
    cardSubtitle: { fontSize: 13, color: '#64748B', marginTop: 2 },
    formGroup: { marginBottom: 20 },
    labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    formLabel: { fontSize: 14, fontWeight: '700', color: '#475569' },
    inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 14, borderWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: 16 },
    inputWrapperError: { borderColor: '#EF4444' },
    inputIcon: { marginRight: 12 },
    formInput: { flex: 1, height: 52, fontSize: 16, color: '#1E293B' },
    textAreaWrapper: { alignItems: 'flex-start', paddingVertical: 12 },
    textArea: { flex: 1, minHeight: 100, fontSize: 16, color: '#1E293B', textAlignVertical: 'top' },
    pickerContainer: { backgroundColor: '#F8FAFC', borderRadius: 14, borderWidth: 1, borderColor: '#E2E8F0', overflow: 'hidden' },
    picker: { width: '100%', color: '#1E293B' },

    // Özellik 2-C: Geliştir butonu
    improveBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EEF2FF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
    improveBtnText: { fontSize: 12, fontWeight: '700', color: '#6366F1' },

    // Özellik 1: Analiz butonu
    analyzeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#EEF2FF', borderRadius: 14, paddingVertical: 14, marginBottom: 16, borderWidth: 1, borderColor: '#C7D2FE', borderStyle: 'dashed' },
    analyzeBtnText: { fontSize: 14, fontWeight: '700', color: '#6366F1' },

    // Özellik 1: AI öneri banner
    suggestionBanner: { backgroundColor: '#EEF2FF', borderRadius: 14, padding: 14, marginBottom: 20, borderWidth: 1, borderColor: '#C7D2FE' },
    suggestionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
    suggestionTitle: { fontSize: 13, fontWeight: '800', color: '#4338CA' },
    suggestionPriority: { fontSize: 15, fontWeight: '700', color: '#1E293B', marginBottom: 4 },
    suggestionReason: { fontSize: 12, color: '#475569', marginBottom: 6 },
    suggestionHint: { fontSize: 11, color: '#818CF8', fontStyle: 'italic' },

    // Öncelik butonları
    priorityRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    priorityBtn: { flex: 1, minWidth: '45%', paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, borderColor: '#E2E8F0', alignItems: 'center', backgroundColor: '#fff', flexDirection: 'row', justifyContent: 'center' },
    priorityBtnText: { fontSize: 13, fontWeight: '700', color: '#64748B' },

    saveBtn: { backgroundColor: '#EF4444', borderRadius: 16, padding: 18, alignItems: 'center', marginTop: 12, flexDirection: 'row', justifyContent: 'center' },
    saveBtnDisabled: { backgroundColor: '#94A3B8' },
    saveBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    errorText: { color: '#EF4444', fontSize: 12, marginTop: 4, marginLeft: 4 },
});
