import jsPDF from 'jspdf';
import toast from 'react-hot-toast';

export const getCertificateTemplate = (cert) => {
    const order = cert.courseId?.seriesOrder;
    const title = (cert.courseId?.title || cert.courseTitle || '').toLowerCase();
    
    if (order === 1 || title.includes('part-1') || title.includes('1 to 30')) {
        return 'https://res.cloudinary.com/dbbll23jz/image/upload/v1780654748/Certificate-1_xnrs9y.png';
    } else if (order === 2 || title.includes('part-2') || title.includes('31 to 60')) {
        return 'https://res.cloudinary.com/dbbll23jz/image/upload/v1780654744/Certificate2_wsx0hl.png';
    } else if (order === 3 || title.includes('part-3') || title.includes('61 to 90')) {
        return 'https://res.cloudinary.com/dbbll23jz/image/upload/v1780654744/Certificate3_2_ubo89f.png';
    }
    
    // Default
    return 'https://res.cloudinary.com/dbbll23jz/image/upload/v1780654748/Certificate-1_xnrs9y.png';
};

export const downloadCertificatePDF = async (cert, user) => {
    try {
        if (!cert) {
            toast.error('Certificate not found');
            return false;
        }

        const doc = new jsPDF({
            orientation: 'landscape',
            unit: 'px',
            format: [842, 595] // Standard landscape letter size
        });

        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = getCertificateTemplate(cert);

        await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
        });

        const width = doc.internal.pageSize.getWidth();
        const height = doc.internal.pageSize.getHeight();

        // Add template image
        doc.addImage(img, 'JPEG', 0, 0, width, height);

        // ─── NAME ────────────────────────────────────────────────────────────────
        const nameY = height * 0.565;
        const nameX = width * 0.5;
        
        const name = cert.userName || user?.name || '';
        doc.setFontSize(36);
        doc.setFont('times', 'bolditalic');
        doc.setTextColor(26, 37, 47);
        doc.text(name, nameX, nameY, { align: 'center', baseline: 'bottom' });

        // ─── DATE ────────────────────────────────────────────────────────────────
        const dateY = height * 0.81;
        const dateX = width * 0.5;

        const date = new Date(cert.issuedAt || cert.createdAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        doc.setFontSize(14);
        doc.setFont('times', 'bold');
        doc.setTextColor(26, 37, 47);
        doc.text(date, dateX, dateY, { align: 'center', baseline: 'bottom' });

        // ─── CERTIFICATE ID ───────────────────────────────────────────────────────
        doc.setFontSize(16);
        doc.setTextColor(0, 0, 0);
        doc.text(
            `Certificate ID: ${cert.certificateNumber}`,
            width - 40,
            height - 25,
            { align: 'right' }
        );

        // Save
        const fileName = `Certificate-${(cert.userName || user?.name || 'User').replace(/\s+/g, '_')}-${cert.certificateNumber || 'cert'}.pdf`;
        doc.save(fileName);

        toast.success('Certificate downloaded successfully!');
        return true;
    } catch (error) {
        console.error('Error downloading certificate:', error);
        toast.error('Failed to download certificate. Please try again.');
        return false;
    }
};
