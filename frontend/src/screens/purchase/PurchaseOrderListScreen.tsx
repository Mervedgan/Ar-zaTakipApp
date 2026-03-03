import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export function PurchaseOrderListScreen() {
    return (
        <View style={styles.container}>
            <Text>Satın Alma Talepleri (Yakında...)</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});
