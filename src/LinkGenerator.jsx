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
    <div className="min-h-screen flex items-start justify-center p-6 pt-12">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm w-full max-w-2xl p-8">
        <div className="mb-6">
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center">
              <span className="text-white text-xs font-bold">B</span>
            </div>
            <span className="text-lg font-semibold text-gray-900">Breeze Finance</span>
          </div>
          <h1 className="text-lg font-semibold text-gray-900">
            Merchant Link Generator
          </h1>
          <p className="text-sm text-gray-500 mt-1">Generate pre-filled bank details form links for merchants.</p>
        </div>

        {/* Mode toggle */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setMode('single')}
            className={`px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
              mode === 'single' ? 'bg-emerald-50 text-emerald-500' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            Single
          </button>
          <button
            onClick={() => setMode('bulk')}
            className={`px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
              mode === 'bulk' ? 'bg-emerald-50 text-emerald-500' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            Bulk (CSV)
          </button>
        </div>

        {mode === 'single' ? (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1.5">Merchant ID <span className="text-red-500">*</span></label>
                <input
                  value={mchId}
                  onChange={(e) => setMchId(e.target.value)}
                  placeholder="e.g. mch_4c77a5418e54072d"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/40 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1.5">Merchant Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Breeze Gaming"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/40 transition-colors"
                />
              </div>
            </div>
            <button
              onClick={generateSingle}
              disabled={!mchId.trim()}
              className="bg-emerald-500 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Generate Link
            </button>

            {generatedLink && (
              <div className="mt-6 p-4 bg-gray-50/60 border border-gray-200 rounded-xl">
                <label className="block text-xs font-medium text-gray-500 mb-2">Generated Link</label>
                <div className="flex items-center gap-2">
                  <input
                    readOnly
                    value={generatedLink}
                    className="flex-1 px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-700"
                    onClick={(e) => e.target.select()}
                  />
                  <button
                    onClick={copySingle}
                    className="px-4 py-2.5 bg-emerald-500 text-white text-sm rounded-lg hover:bg-emerald-600 transition-colors whitespace-nowrap"
                  >
                    {copyLabel}
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1.5">Paste CSV <span className="text-gray-400 font-normal">(one per line: mchID, Merchant Name)</span></label>
            <textarea
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              rows={6}
              placeholder={`mch_4c77a5418e54072d, Breeze Gaming\nmch_8b22f1339a61d0e3, Acme Corp\nmch_1a44c6782b90e5f7, Widget Co`}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/40 transition-colors"
            />
            <button
              onClick={generateBulk}
              disabled={!csvText.trim()}
              className="mt-3 bg-emerald-500 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Generate Links
            </button>

            {bulkLinks.length > 0 && (
              <div className="mt-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-500">{bulkLinks.length} links generated</span>
                  <button
                    onClick={copyAll}
                    className="px-4 py-2 bg-emerald-500 text-white text-sm rounded-lg hover:bg-emerald-600 transition-colors"
                  >
                    {bulkCopyLabel}
                  </button>
                </div>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {bulkLinks.map((l, i) => (
                    <div key={i} className="p-3.5 bg-gray-50/60 border border-gray-200 rounded-xl">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-xs text-gray-400">{l.id}</span>
                        {l.name && <span className="text-xs text-gray-500">— {l.name}</span>}
                      </div>
                      <input
                        readOnly
                        value={l.link}
                        className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-700"
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
