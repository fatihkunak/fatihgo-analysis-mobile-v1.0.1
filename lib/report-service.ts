import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Paths, File } from 'expo-file-system';
import { Alert } from 'react-native';

export interface ReportData {
  title: string;
  channel: string;
  views: number;
  likes: number;
  engagementRate: string;
  scenes: Array<{
    scene: number;
    duration: string;
    description: string;
    script: string;
    sentiment?: string;
  }>;
}

export const generatePDFReport = async (analysisData: ReportData): Promise<string> => {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Video Analiz Raporu</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        h1 { color: #6C63FF; }
        .header { text-align: center; margin-bottom: 30px; }
        .stats { background: #f5f5f5; padding: 15px; border-radius: 10px; margin: 20px 0; }
        .scene-card { border: 1px solid #ddd; padding: 15px; margin: 10px 0; border-radius: 8px; page-break-inside: avoid; }
        .time { color: #6C63FF; font-weight: bold; }
        .sentiment { float: right; font-size: 12px; font-weight: bold; padding: 2px 8px; border-radius: 10px; }
        .Giriş { background: #dcfce7; color: #166534; }
        .Gelişme { background: #fef9c3; color: #854d0e; }
        .Sonuç { background: #e0e7ff; color: #3730a3; }
        .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #999; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🎬 Fatihgo Analysis - Video Raporu</h1>
        <p>Oluşturulma: ${new Date().toLocaleString('tr-TR')}</p>
      </div>

      <div class="stats">
        <h2>📊 Video Bilgileri</h2>
        <p><strong>Başlık:</strong> ${analysisData.title}</p>
        <p><strong>Kanal:</strong> ${analysisData.channel}</p>
        <p><strong>İzlenme:</strong> ${analysisData.views.toLocaleString()}</p>
        <p><strong>Beğeni:</strong> ${analysisData.likes.toLocaleString()}</p>
        <p><strong>Etkileşim Oranı:</strong> %${analysisData.engagementRate}</p>
      </div>

      <h2>🎞️ Sahne Analizi</h2>
      ${analysisData.scenes.map(scene => `
        <div class="scene-card">
          <div class="time">⏱️ ${scene.duration}
            ${scene.sentiment ? `<span class="sentiment ${scene.sentiment}">${scene.sentiment}</span>` : ''}
          </div>
          <h3>Sahne ${scene.scene}</h3>
          <p>${scene.description}</p>
          <p style="font-style: italic; color: #666;">"${scene.script}"</p>
        </div>
      `).join('') || '<p>Sahne bilgisi bulunamadı.</p>'}

      <div class="footer">
        <p>Fatihgo Analysis - www.fatihgo.com | info@fatihgo.com</p>
      </div>
    </body>
    </html>
  `;

  try {
    const { uri } = await Print.printToFileAsync({ html: htmlContent });
    return uri;
  } catch (error) {
    console.log('PDF oluşturma hatası:', error);
    throw error;
  }
};

export const generateZIPReport = async (analysisData: ReportData) => {
  try {
    // 1. Önce PDF oluştur
    const pdfUri = await generatePDFReport(analysisData);

    // 2. JSON verisini de ekle (new FileSystem API)
    const jsonFile = new File(Paths.document, 'analysis_data.json');
    await jsonFile.write(JSON.stringify(analysisData, null, 2));
    const jsonPath = jsonFile.uri;

    return { pdfUri, jsonPath };
  } catch (error) {
    console.log('ZIP raporu hazırlama hatası:', error);
    throw error;
  }
};

export const sharePDF = async (analysisData: ReportData) => {
  try {
    const pdfUri = await generatePDFReport(analysisData);
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(pdfUri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Analiz Raporunu Paylaş',
        UTI: 'com.adobe.pdf'
      });
    }
  } catch (error) {
    Alert.alert('Hata', 'PDF paylaşılamadı');
  }
};

export const shareZIPReport = async (analysisData: ReportData) => {
  try {
    const { pdfUri, jsonPath } = await generateZIPReport(analysisData);

    if (await Sharing.isAvailableAsync()) {
      // PDF ve JSON'ı ardışık paylaş (ZIP alternatifi)
      await Sharing.shareAsync(pdfUri, {
        mimeType: 'application/pdf',
        dialogTitle: 'PDF Raporu Paylaş',
        UTI: 'com.adobe.pdf'
      });

      await Sharing.shareAsync(jsonPath, {
        mimeType: 'application/json',
        dialogTitle: 'Ham Veriyi Paylaş',
        UTI: 'public.json'
      });
    }
  } catch (error) {
    Alert.alert('Hata', 'Dışa aktarma başarısız');
  }
};
