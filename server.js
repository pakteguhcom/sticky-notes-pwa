import 'dotenv/config';
import app from './src/app.mjs';

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Sticky Notes PWA running on http://localhost:${PORT}`);
});
