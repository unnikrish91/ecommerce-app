import './globals.css';
import { StoreProvider } from '../lib/store';
import Navbar from '../components/Navbar';

export const metadata = { title: 'MyShop', description: 'Simple e-commerce store' };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <StoreProvider>
          <Navbar />
          <main className="container">{children}</main>
        </StoreProvider>
      </body>
    </html>
  );
}
