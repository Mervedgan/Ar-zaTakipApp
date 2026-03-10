import React, { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, ActivityIndicator,
    TouchableOpacity, Dimensions, RefreshControl
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import api from '../../services/api';

const { width } = Dimensions.get('window');

// Native Türk çubuğu grafik (SVG yok)
function BarChartNative({ data, labels, color = '#6366F1', maxValue }: {
    data: number[];
    labels: string[];
    color?: string;
    maxValue?: number;
}) {
    const max = maxValue ?? Math.max(...data, 1);
    return (
        <View style={barStyles.container}>
            {data.map((val, i) => {
                const heightPct = max > 0 ? (val / max) : 0;
                return (
                    <View key={i} style={barStyles.barWrapper}>
                        <Text style={barStyles.barValue}>{val}</Text>
                        <View style={barStyles.barBg}>
                            <View
                                style={[
                                    barStyles.barFill,
                                    { height: `${Math.round(heightPct * 100)}%`, backgroundColor: color }
                                ]}
                            />
                        </View>
                        <Text style={barStyles.barLabel} numberOfLines={1}>{labels[i]}</Text>
                    </View>
                );
            })}
        </View>
    );
}

const barStyles = StyleSheet.create({
    container: { flexDirection: 'row', alignItems: 'flex-end', height: 180, gap: 6, paddingTop: 20 },
    barWrapper: { flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end' },
    barBg: { width: '100%', height: '80%', backgroundColor: '#F1F5F9', borderRadius: 6, justifyContent: 'flex-end', overflow: 'hidden' },
    barFill: { width: '100%', borderRadius: 6 },
    barValue: { fontSize: 10, fontWeight: '700', color: '#64748B', marginBottom: 2 },
    barLabel: { fontSize: 9, color: '#94A3B8', marginTop: 4, textAlign: 'center' },
});

// Durum dağılımı yatay çubukları
function StatusBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
    const pct = total > 0 ? (count / total) * 100 : 0;
    return (
        <View style={sbStyles.row}>
            <View style={[sbStyles.dot, { backgroundColor: color }]} />
            <Text style={sbStyles.label}>{label}</Text>
            <View style={sbStyles.track}>
                <View style={[sbStyles.fill, { width: `${Math.round(pct)}%`, backgroundColor: color }]} />
            </View>
            <Text style={sbStyles.count}>{count}</Text>
        </View>
    );
}

const sbStyles = StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
    dot: { width: 10, height: 10, borderRadius: 5 },
    label: { fontSize: 12, color: '#64748B', width: 70 },
    track: { flex: 1, height: 10, backgroundColor: '#F1F5F9', borderRadius: 5, overflow: 'hidden' },
    fill: { height: '100%', borderRadius: 5 },
    count: { fontSize: 13, fontWeight: '700', color: '#1E293B', width: 24, textAlign: 'right' },
});

// Yardımcı fonksiyon: Liste render etme
function renderTopList(list: { name: string; count: number }[], title: string, icon: string, baseColor: string) {
    const maxCount = list.length > 0 ? list[0].count : 0;
    const rankColors = [baseColor, '#F97316', '#F59E0B', '#6366F1', '#8B5CF6', '#06B6D4', '#10B981', '#64748B'];

    return (
        <View style={styles.card}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                <Ionicons name={icon} size={18} color="#1E293B" style={{ marginRight: 6 }} />
                <Text style={styles.cardTitle}>{title}</Text>
            </View>
            <Text style={styles.cardSub}>Arıza sayısına göre ilk {list.length || 0} kayıt</Text>

            {list.length === 0 ? (
                <View style={{ alignItems: 'center', paddingVertical: 32, backgroundColor: '#F8FAFC', borderRadius: 12, marginTop: 12 }}>
                    <Ionicons name="construct-outline" size={40} color="#CBD5E1" />
                    <Text style={{ color: '#94A3B8', fontSize: 13, marginTop: 8, fontWeight: '500' }}>Henüz kayıt bulunmuyor</Text>
                    <Text style={{ color: '#CBD5E1', fontSize: 11, marginTop: 2 }}>Veriler eklendikçe burada listelenecek</Text>
                </View>
            ) : (
                <View style={{ marginTop: 14, gap: 12 }}>
                    {list.map((item, i) => {
                        const pct = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
                        const barColor = rankColors[i] ?? '#94A3B8';
                        return (
                            <View key={i} style={topStyles.row}>
                                <View style={[topStyles.rankBadge, { backgroundColor: barColor }]}>
                                    <Text style={topStyles.rankNum}>{i + 1}</Text>
                                </View>
                                <View style={topStyles.infoCol}>
                                    <View style={topStyles.labelRow}>
                                        <Text style={topStyles.name} numberOfLines={1}>{item.name}</Text>
                                        <Text style={[topStyles.count, { color: barColor }]}>{item.count} arıza</Text>
                                    </View>
                                    <View style={topStyles.track}>
                                        <View style={[topStyles.fill, { width: `${Math.round(pct)}%`, backgroundColor: barColor }]} />
                                    </View>
                                </View>
                            </View>
                        );
                    })}
                </View>
            )}
        </View>
    );
}

export function AdminAnalyticsScreen({ navigation }: any) {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const [totalFaults, setTotalFaults] = useState(0);
    const [resolvedCount, setResolvedCount] = useState(0);
    const [avgResolutionDays, setAvgResolutionDays] = useState(0);

    const [topAssets, setTopAssets] = useState<{ name: string; count: number }[]>([]);
    const [topOfficeItems, setTopOfficeItems] = useState<{ name: string; count: number }[]>([]);
    const [weeklyTrend, setWeeklyTrend] = useState<{ labels: string[]; data: number[] }>({ labels: [], data: [] });
    const [monthlyData, setMonthlyData] = useState<{ labels: string[]; data: number[] }>({ labels: [], data: [] });
    const [statusCounts, setStatusCounts] = useState<{ label: string; count: number; color: string }[]>([]);

    const fetchAnalytics = async () => {
        try {
            const res = await api.get('/faultreports');
            const faults: any[] = res.data;

            setTotalFaults(faults.length);
            const resolved = faults.filter(f => f.status === 'Resolved' || f.status === 'Closed');
            setResolvedCount(resolved.length);

            // Ort. çözüm süresi
            const withResolved = faults.filter(f => f.resolvedAt && f.createdAt);
            if (withResolved.length > 0) {
                const totalDays = withResolved.reduce((acc, f) => {
                    return acc + (new Date(f.resolvedAt).getTime() - new Date(f.createdAt).getTime()) / 86400000;
                }, 0);
                setAvgResolutionDays(Math.round(totalDays / withResolved.length));
            }

            // En çok arızalanan top 8 (Makineler)
            const machineMap: Record<string, number> = {};
            const officeMap: Record<string, number> = {};

            faults.forEach(f => {
                if (f.assetName) {
                    // Not: backend AssetDto'da Category döndüğü için her fault report'un asset bilgisinde category olmalı.
                    // Eğer faultreports endpoint'i category döndürmüyorsa, assets listesi ile joinleyebiliriz.
                    // Şimdilik assetName üzerinden gruplayacağız ama category bazlı ayıracağız.
                    // Asset category bilgisini fault f içinde varsayıyoruz (Backend DTO güncellendi)
                    if (f.category === 'Ofis Eşyası') {
                        officeMap[f.assetName] = (officeMap[f.assetName] || 0) + 1;
                    } else {
                        machineMap[f.assetName] = (machineMap[f.assetName] || 0) + 1;
                    }
                }
            });

            const sortedMachines = Object.entries(machineMap).sort((a, b) => b[1] - a[1]).slice(0, 8);
            const sortedOffice = Object.entries(officeMap).sort((a, b) => b[1] - a[1]).slice(0, 8);

            setTopAssets(sortedMachines.map(([name, count]) => ({ name, count })));
            setTopOfficeItems(sortedOffice.map(([name, count]) => ({ name, count })));

            // Son 8 haftalık trend
            const weekLabels: string[] = [];
            const weekCounts: number[] = [];
            for (let i = 7; i >= 0; i--) {
                const end = new Date(); end.setDate(end.getDate() - i * 7);
                const start = new Date(end.getTime() - 7 * 86400000);
                weekCounts.push(faults.filter(f => { const d = new Date(f.createdAt); return d >= start && d < end; }).length);
                weekLabels.push(`H${8 - i}`);
            }
            setWeeklyTrend({ labels: weekLabels, data: weekCounts });

            // Son 6 ay
            const monthNames = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
            const ml: string[] = []; const mc: number[] = [];
            for (let i = 5; i >= 0; i--) {
                const d = new Date(); d.setMonth(d.getMonth() - i);
                mc.push(faults.filter(f => { const fd = new Date(f.createdAt); return fd.getMonth() === d.getMonth() && fd.getFullYear() === d.getFullYear(); }).length);
                ml.push(monthNames[d.getMonth()]);
            }
            setMonthlyData({ labels: ml, data: mc });

            // Durum dağılımı
            const statuses = [
                { key: 'Open', label: 'Açık', color: '#EF4444' },
                { key: 'InProgress', label: 'Aktif', color: '#F59E0B' },
                { key: 'WaitingForPart', label: 'Bekliyor', color: '#8B5CF6' },
                { key: 'Resolved', label: 'Çözüldü', color: '#10B981' },
                { key: 'Closed', label: 'Kapatıldı', color: '#6B7280' },
            ];
            setStatusCounts(statuses.map(s => ({ ...s, count: faults.filter(f => f.status === s.key).length })).filter(s => s.count > 0));

        } catch (e) {
            console.log('Analytics error', e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(useCallback(() => { fetchAnalytics(); }, []));

    if (loading) {
        return <View style={styles.center}><ActivityIndicator size="large" color="#6366F1" /></View>;
    }

    const resolutionRate = totalFaults > 0 ? Math.round((resolvedCount / totalFaults) * 100) : 0;

    return (
        <ScrollView
            style={styles.container}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchAnalytics(); }} />}
        >
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.openDrawer()} style={styles.menuBtn}>
                    <Ionicons name="menu-outline" size={28} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Analitik</Text>
                <View style={{ width: 40 }} />
            </View>

            {/* KPI */}
            <View style={styles.kpiRow}>
                {[
                    { label: 'Toplam', value: totalFaults, color: '#6366F1', icon: 'analytics-outline' },
                    { label: 'Çözüm %', value: `${resolutionRate}%`, color: '#10B981', icon: 'checkmark-circle-outline' },
                    { label: 'Ort. Gün', value: avgResolutionDays, color: '#F59E0B', icon: 'time-outline' },
                ].map(k => (
                    <View key={k.label} style={[styles.kpiCard, { backgroundColor: k.color }]}>
                        <Ionicons name={k.icon} size={22} color="#fff" />
                        <Text style={styles.kpiVal}>{k.value}</Text>
                        <Text style={styles.kpiLabel}>{k.label}</Text>
                    </View>
                ))}
            </View>

            {/* Monthly Bar */}
            {monthlyData.data.length > 0 && (
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Aylık Arıza Sayısı</Text>
                    <Text style={styles.cardSub}>Son 6 ay</Text>
                    <BarChartNative data={monthlyData.data} labels={monthlyData.labels} color="#6366F1" />
                </View>
            )}

            {/* Weekly Bar */}
            {weeklyTrend.data.length > 0 && (
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Haftalık Trend</Text>
                    <Text style={styles.cardSub}>Son 8 hafta</Text>
                    <BarChartNative data={weeklyTrend.data} labels={weeklyTrend.labels} color="#8B5CF6" />
                </View>
            )}

            {/* Status Distribution */}
            {statusCounts.length > 0 && (
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Durum Dağılımı</Text>
                    <Text style={styles.cardSub}>Toplam {totalFaults} arıza</Text>
                    <View style={{ marginTop: 12 }}>
                        {statusCounts.map(s => (
                            <StatusBar key={s.label} label={s.label} count={s.count} total={totalFaults} color={s.color} />
                        ))}
                    </View>
                </View>
            )}

            {/* Top Faulted Assets — Makineler */}
            {renderTopList(topAssets, 'En Çok Arızalanan Makineler', 'stats-chart', '#6366F1')}

            {/* Top Faulted Assets — Ofis Eşyaları */}
            {renderTopList(topOfficeItems, 'En Çok Arızalanan Ofis Eşyaları', 'desktop-outline', '#F97316')}



            <View style={{ height: 32 }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F1F5F9' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F1F5F9' },
    header: {
        backgroundColor: '#6366F1', flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between', paddingTop: 52, paddingBottom: 20, paddingHorizontal: 20,
    },
    menuBtn: { padding: 4 },
    headerTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
    kpiRow: { flexDirection: 'row', padding: 16, gap: 10 },
    kpiCard: {
        flex: 1, borderRadius: 14, padding: 14, alignItems: 'center',
        elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 6,
    },
    kpiVal: { fontSize: 22, fontWeight: '800', color: '#fff', marginTop: 6 },
    kpiLabel: { fontSize: 11, color: 'rgba(255,255,255,0.85)', fontWeight: '600', marginTop: 2 },
    card: {
        backgroundColor: '#fff', borderRadius: 20, marginHorizontal: 16, marginBottom: 16,
        padding: 20, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 4,
    },
    cardTitle: { fontSize: 15, fontWeight: '700', color: '#1E293B', marginBottom: 2 },
    cardSub: { fontSize: 12, color: '#94A3B8', marginBottom: 4 },
    emptyState: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 32 },
    emptyText: { fontSize: 16, fontWeight: '700', color: '#94A3B8', marginTop: 16, textAlign: 'center' },
    emptySubText: { fontSize: 13, color: '#CBD5E1', marginTop: 8, textAlign: 'center' },
});

const topStyles = StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    rankBadge: { width: 26, height: 26, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
    rankNum: { fontSize: 12, fontWeight: '800', color: '#fff' },
    infoCol: { flex: 1 },
    labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    name: { fontSize: 13, fontWeight: '700', color: '#1E293B', flex: 1, marginRight: 8 },
    count: { fontSize: 12, fontWeight: '800' },
    track: { height: 8, backgroundColor: '#F1F5F9', borderRadius: 4, overflow: 'hidden' },
    fill: { height: '100%', borderRadius: 4 },
});
