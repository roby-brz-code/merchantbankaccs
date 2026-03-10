import { useState } from 'react';

const BASE_URL = window.location.origin;

export default function LinkGenerator() {
  const [mode, setMode] = useState('single'); // 'single' | 'bulk'
  const [mchId, setMchId] = useState('');
  const [name, setName] = useState('');
  const [generatedLink, setGeneratedLink] = useState('');
  const [copyLabel, setCopyLabel] = useState('Copy');

  // Bulk mode
  const [csvText, setCsvText] = useState('');
  const [bulkLinks, setBulkLinks] = useState([]);
  const [bulkCopyLabel, setBulkCopyLabel] = useState('Copy All');

  function buildLink(id, merchantName) {
    const params = new URLSearchParams();
    if (id.trim()) params.set('mchID', id.trim());
    if (merchantName.trim()) params.set('name', merchantName.trim());
    return `${BASE_URL}/?${params.toString()}`;
  }

  function generateSingle() {
    if (!mchId.trim()) return;
    setGeneratedLink(buildLink(mchId, name));
  }

  function generateBulk() {
    const lines = csvText.trim().split('\n').filter(Boolean);
    const links = lines.map((line) => {
      const [id, ...rest] = line.split(',');
      const merchantName = rest.join(',').trim();
      return { id: id.trim(), name: merchantName, link: buildLink(id, merchantName) };
    });
    setBulkLinks(links);
  }

  function copySingle() {
    navigator.clipboard.writeText(generatedLink).then(() => {
      setCopyLabel('Copied!');
      setTimeout(() => setCopyLabel('Copy'), 2000);
    });
  }

  function copyAll() {
    const text = bulkLinks.map((l) => `${l.id}\t${l.name}\t${l.link}`).join('\n');
    navigator.clipboard.writeText(text).then(() => {
      setBulkCopyLabel('Copied!');
      setTimeout(() => setBulkCopyLabel('Copy All'), 2000);
    });
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-start justify-center p-4 pt-12">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 w-full max-w-2xl p-8">
        <div className="mb-6">
          <div className="inline-block bg-[#0f172a] text-white text-xs font-bold tracking-widest px-4 py-2 rounded mb-4"
               style={{ fontFamily: 'DM Sans, sans-serif' }}>
            BREEZE LABS
          </div>
          <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'DM Sans, sans-serif' }}>
            Merchant Link Generator
          </h1>
          <p className="text-sm text-gray-500 mt-1">Generate pre-filled bank details form links for merchants.</p>
        </div>

        {/* Mode toggle */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setMode('single')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition ${
              mode === 'single' ? 'bg-[#0f172a] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Single
          </button>
          <button
            onClick={() => setMode('bulk')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition ${
              mode === 'bulk' ? 'bg-[#0f172a] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Bulk (CSV)
          </button>
        </div>

        {mode === 'single' ? (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-1">Merchant ID <span className="text-red-500">*</span></label>
                <input
                  value={mchId}
                  onChange={(e) => setMchId(e.target.value)}
                  placeholder="e.g. mch_4c77a5418e54072d"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#0f172a]/30"
                  style={{ fontFamily: 'DM Mono, monospace' }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Merchant Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Breeze Gaming"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#0f172a]/30"
                />
              </div>
            </div>
            <button
              onClick={generateSingle}
              disabled={!mchId.trim()}
              className="bg-[#0f172a] text-white px-6 py-2 rounded-md text-sm font-medium hover:bg-[#1e293b] disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              Generate Link
            </button>

            {generatedLink && (
              <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <label className="block text-xs font-medium text-gray-500 mb-2">Generated Link</label>
                <div className="flex items-center gap-2">
                  <input
                    readOnly
                    value={generatedLink}
                    className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-md text-sm font-mono"
                    onClick={(e) => e.target.select()}
                  />
                  <button
                    onClick={copySingle}
                    className="px-4 py-2 bg-[#0f172a] text-white text-sm rounded-md hover:bg-[#1e293b] transition whitespace-nowrap"
                  >
                    {copyLabel}
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium mb-1">Paste CSV <span className="text-gray-400">(one per line: mchID, Merchant Name)</span></label>
            <textarea
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              rows={6}
              placeholder={`mch_4c77a5418e54072d, Breeze Gaming\nmch_8b22f1339a61d0e3, Acme Corp\nmch_1a44c6782b90e5f7, Widget Co`}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#0f172a]/30"
            />
            <button
              onClick={generateBulk}
              disabled={!csvText.trim()}
              className="mt-3 bg-[#0f172a] text-white px-6 py-2 rounded-md text-sm font-medium hover:bg-[#1e293b] disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              Generate Links
            </button>

            {bulkLinks.length > 0 && (
              <div className="mt-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-700">{bulkLinks.length} links generated</span>
                  <button
                    onClick={copyAll}
                    className="px-4 py-2 bg-[#0f172a] text-white text-sm rounded-md hover:bg-[#1e293b] transition"
                  >
                    {bulkCopyLabel}
                  </button>
                </div>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {bulkLinks.map((l, i) => (
                    <div key={i} className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-gray-400">{l.id}</span>
                        {l.name && <span className="text-xs text-gray-600">- {l.name}</span>}
                      </div>
                      <input
                        readOnly
                        value={l.link}
                        className="w-full px-2 py-1 bg-white border border-gray-200 rounded text-xs font-mono text-gray-700"
                        onClick={(e) => e.target.select()}
                      />
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
