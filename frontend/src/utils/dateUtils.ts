export const formatDate = (dateString?: string | null) => {
    if (!dateString) return '---';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '---';
        return date.toLocaleDateString('tr-TR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    } catch (error) {
        return '---';
    }
};

export const formatDateTime = (dateString?: string | null) => {
    if (!dateString) return '---';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '---';
        return date.toLocaleTimeString('tr-TR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (error) {
        return '---';
    }
};
