import express from 'express';
import {
  getReadOnlySheetBaselineState,
  readGoogleSheetReferenceData,
} from './googleSheets.ts';

export function createApiApp(): express.Express {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  const handleGetReference = async (_req: express.Request, res: express.Response) => {
    try {
      const ref = await readGoogleSheetReferenceData();
      res.setHeader('Cache-Control', 'no-store');
      res.json(ref);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Không thể đọc dữ liệu từ Google Sheets.';
      res.status(502).json({ error: msg });
    }
  };

  app.get('/api/sheets/reference', handleGetReference);

  const handleGetBaselineState = async (_req: express.Request, res: express.Response) => {
    try {
      const state = await getReadOnlySheetBaselineState();
      res.setHeader('Cache-Control', 'no-store');
      res.json(state);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Không thể tải dữ liệu tồn kho.';
      res.status(502).json({ error: msg });
    }
  };

  app.get('/api/inventory/state', handleGetBaselineState);
  app.get('/api/sheets/state', handleGetBaselineState);

  return app;
}
