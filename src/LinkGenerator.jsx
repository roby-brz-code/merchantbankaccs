import { useState } from 'react';

const BASE_URL = window.location.origin;

export default function LinkGenerator() {
  const [mode, setMode] = useState('single');
  const [mchId, setMchId] = useState('');
  const [name, setName] = useState('');
  const [generatedLink, setGeneratedLink] = useState('');
  const [copyLabel, setCopyLabel] = useState('Copy');
  const [csvText, setCsvText] = useState('');
  const [bulkLinks, setBulkLinks] = useState([]);
  const [bulkCopyLabel, setBulkCopyLabel] = useState('Copy All');

  function buildLink(id, merchantName) {
    const params = new URLSearchParams();
    if (id.trim()) params.set('mchID', id.trim());
    if (merchantName.trim()) params.set('name', merchantName.trim());
    return `${BASE_URL}/?${params.toString()}`;
  }

  function generateSingle() { if (!mchId.trim()) return; setGeneratedLink(buildLink(mchId, name)); }

  function generateBulk() {
    const lines = csvText.trim().split('\n').filter(Boolean);
    setBulkLinks(lines.map((line) => { const [id, ...rest] = line.split(','); const merchantName = rest.join(',').trim(); return { id: id.trim(), name: merchantName, link: buildLink(id, merchantName) }; }));
  }

  function copySingle() { navigator.clipboard.writeText(generatedLink).then(() => { setCopyLabel('Copied!'); setTimeout(() => setCopyLabel('Copy'), 2000); }); }
  function copyAll() { const text = bulkLinks.map((l) => `${l.id}\t${l.name}\t${l.link}`).join('\n'); navigator.clipboard.writeText(text).then(() => { setBulkCopyLabel('Copied!'); setTimeout(() => setBulkCopyLabel('Copy All'), 2000); }); }

  const inputCls = "w-full px-3 py-2.5 border border-[#E2E8F0] rounded-[12px] text-[12px] text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2F6DF6]/20 focus:border-[#2F6DF6]/50 transition-colors";

  return (
    <div className="min-h-screen flex items-start justify-center p-6 pt-12">
      <div className="bg-white rounded-[12px] border border-[#E2E8F0] w-full max-w-2xl p-8" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        <div className="mb-6">
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-8 h-8 rounded-[10px] bg-[#2F6DF6] flex items-center justify-center">
              <span className="text-white text-[11px] font-bold">B</span>
            </div>
            <span className="text-[18px] font-semibold text-[#0F172A] tracking-[-0.015em]">Breeze</span>
          </div>
          <h1 className="text-[22px] font-bold text-[#0F172A] tracking-[-0.015em]">Merchant link generator</h1>
          <p className="text-[12px] text-[#334155] mt-1">Generate pre-filled bank details form links for merchants.</p>
        </div>

        {/* Mode toggle */}
        <div className="flex gap-2 mb-6">
          {['single', 'bulk'].map(m => (
            <button key={m} onClick={() => setMode(m)}
              className={`px-3 py-2 text-[12px] font-medium rounded-[12px] transition-colors ${
                mode === m ? 'bg-[#EDF4FA] text-[#2F6DF6]' : 'text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A]'
              }`}>
              {m === 'single' ? 'Single' : 'Bulk (CSV)'}
            </button>
          ))}
        </div>

        {mode === 'single' ? (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-[11px] font-medium text-[#64748B] mb-1.5">Merchant ID <span className="text-[#DC2626]">*</span></label>
                <input value={mchId} onChange={(e) => setMchId(e.target.value)} placeholder="e.g. mch_4c77a5418e54072d" className={inputCls} />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-[#64748B] mb-1.5">Merchant Name</label>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Breeze Gaming" className={inputCls} />
              </div>
            </div>
            <button onClick={generateSingle} disabled={!mchId.trim()}
              className="bg-[#2F6DF6] text-white px-6 py-2.5 rounded-[12px] text-[12px] font-semibold hover:bg-[#1F3F8E] disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              Generate link
            </button>

            {generatedLink && (
              <div className="mt-6 p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-[12px]">
                <label className="block text-[9.5px] font-semibold uppercase tracking-[0.1em] text-[#4A7DFF] mb-2">Generated link</label>
                <div className="flex items-center gap-2">
                  <input readOnly value={generatedLink} className="flex-1 px-3 py-2.5 bg-white border border-[#E2E8F0] rounded-[12px] text-[12px] text-[#334155]" onClick={(e) => e.target.select()} />
                  <button onClick={copySingle} className="px-4 py-2.5 bg-[#2F6DF6] text-white text-[12px] font-semibold rounded-[12px] hover:bg-[#1F3F8E] transition-colors whitespace-nowrap">{copyLabel}</button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div>
            <label className="block text-[11px] font-medium text-[#64748B] mb-1.5">Paste CSV <span className="text-[#64748B] font-normal">(one per line: mchID, Merchant Name)</span></label>
            <textarea value={csvText} onChange={(e) => setCsvText(e.target.value)} rows={6}
              placeholder={`mch_4c77a5418e54072d, Breeze Gaming\nmch_8b22f1339a61d0e3, Acme Corp\nmch_1a44c6782b90e5f7, Widget Co`} className={inputCls} />
            <button onClick={generateBulk} disabled={!csvText.trim()}
              className="mt-3 bg-[#2F6DF6] text-white px-6 py-2.5 rounded-[12px] text-[12px] font-semibold hover:bg-[#1F3F8E] disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              Generate links
            </button>

            {bulkLinks.length > 0 && (
              <div className="mt-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[12px] font-medium text-[#64748B]">{bulkLinks.length} links generated</span>
                  <button onClick={copyAll} className="px-4 py-2 bg-[#2F6DF6] text-white text-[12px] font-semibold rounded-[12px] hover:bg-[#1F3F8E] transition-colors">{bulkCopyLabel}</button>
                </div>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {bulkLinks.map((l, i) => (
                    <div key={i} className="p-3.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-[12px]">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-[10px] text-[#64748B]">{l.id}</span>
                        {l.name && <span className="text-[10px] text-[#334155]">— {l.name}</span>}
                      </div>
                      <input readOnly value={l.link} className="w-full px-2.5 py-1.5 bg-white border border-[#E2E8F0] rounded-[10px] text-[10px] text-[#334155]" onClick={(e) => e.target.select()} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
