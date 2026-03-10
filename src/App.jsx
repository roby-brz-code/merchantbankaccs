import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MerchantBankForm from './MerchantBankForm';
import LinkGenerator from './LinkGenerator';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MerchantBankForm />} />
        <Route path="/generate" element={<LinkGenerator />} />
      </Routes>
    </BrowserRouter>
  );
}
