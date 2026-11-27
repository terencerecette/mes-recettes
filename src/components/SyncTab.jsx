import React, { useRef, useState } from 'react';
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Cloud,
  CloudOff,
  Download,
  Eye,
  EyeOff,
  Loader2,
  RefreshCw,
  Upload,
} from 'lucide-react';
import { buildBackupPayload, parseAndValidateBackup } from '../services/storage.js';

function formatSyncDate(iso) {
  if (!iso) return '';
  try {
    return new Intl.DateTimeFormat('fr-FR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export default function SyncTab({
  syncConfig,
  syncStatus,
  lastSync,
  recipes,
  shoppingItems,
  onTestAndSync,
  onDisconnectSync,
  onImportBackup,
  onShowToast,
}) {
  const [url, setUrl] = useState(syncConfig.url || '');
  const [anonKey, setAnonKey] = useState(syncConfig.anonKey || '');
  const [notebookCode, setNotebookCode] = useState(syncConfig.notebookCode || '');
  const [showKey, setShowKey] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [localError, setLocalError] = useState('');

  const fileInputRef = useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    setIsTesting(true);
    try {
      await onTestAndSync({
        url: url.trim(),
        anonKey: anonKey.trim(),
        notebookCode: notebookCode.trim(),
        enabled: true,
      });
    } catch (err) {
      setLocalError(err.message || 'Impossible de synchroniser avec Supabase.');
    } finally {
      setIsTesting(false);
    }
  };

  const handleExportJson = () => {
    const payload = buildBackupPayload(recipes, shoppingItems);
    const json = JSON.stringify(payload, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const objectUrl = URL.createObjectURL(blob);
    const dateStr = new Date().toISOString().slice(0, 10);

    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = `mes-recettes-sauvegarde-${dateStr}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(objectUrl);

    onShowToast?.('Sauvegarde JSON exportée avec succès.', 'success');
  };

  const handleImportFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = parseAndValidateBackup(text);
      await onImportBackup(parsed);
    } catch (err) {
      onShowToast?.(err.message || 'Erreur lors de l’import JSON.', 'error');
    } finally {
      e.target.value = '';
    }
  };

  const isConnected = syncStatus === 'connected' && syncConfig.enabled;
  const isError = syncStatus === 'error' || Boolean(localError);

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div>
        <h2 className="font-serif text-2xl sm:text-3xl font-semibold tracking-tight text-[#26211D]">
          Synchro & Sauvegarde
        </h2>
        <p className="mt-1 text-sm text-[#70675F]">
          Synchronisez gratuitement votre carnet entre votre PC et votre iPhone avec Supabase
        </p>
      </div>

      {/* Statut visuel */}
      <div
        className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-3xl border p-4 sm:p-5 shadow-soft ${
          isConnected
            ? 'border-[#4A7C59]/30 bg-[#4A7C59]/10'
            : isError
              ? 'border-[#C85A32]/30 bg-[#C85A32]/10'
              : 'border-[#EAE5DD] bg-white'
        }`}
      >
        <div className="flex items-center gap-3.5">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
              isConnected
                ? 'bg-[#4A7C59] text-white'
                : isError
                  ? 'bg-[#C85A32] text-white'
                  : 'bg-[#FAF8F5] text-[#70675F] border border-[#EAE5DD]'
            }`}
          >
            {isConnected ? (
              <CheckCircle2 className="h-5 w-5" />
            ) : syncConfig.enabled ? (
              <Cloud className="h-5 w-5" />
            ) : (
              <CloudOff className="h-5 w-5" />
            )}
          </div>
          <div>
            <p className="font-semibold text-sm text-[#26211D]">
              {isConnected
                ? `Connecté • Carnet « ${syncConfig.notebookCode} »`
                : isError
                  ? 'Erreur de synchronisation'
                  : 'Mode local uniquement'}
            </p>
            <p className="text-xs text-[#70675F]">
              {isConnected && lastSync
                ? `Dernière synchronisation : ${formatSyncDate(lastSync)}`
                : 'Vos données sont stockées localement sur cet appareil.'}
            </p>
          </div>
        </div>

        {syncConfig.enabled && (
          <button
            type="button"
            onClick={() => {
              setLocalError('');
              onDisconnectSync();
            }}
            className="min-h-[40px] rounded-xl border border-[#EAE5DD] bg-white px-3.5 py-2 text-xs font-semibold text-[#70675F] hover:text-[#C85A32] transition"
          >
            Repasser en mode local
          </button>
        )}
      </div>

      {/* Formulaire Supabase */}
      <form
        onSubmit={handleSubmit}
        className="rounded-3xl border border-[#EAE5DD] bg-white p-5 sm:p-6 shadow-soft space-y-4"
      >
        <h3 className="font-serif text-lg font-semibold text-[#26211D]">
          Connexion Supabase
        </h3>

        {localError && (
          <div className="rounded-2xl border border-[#C85A32]/30 bg-[#C85A32]/10 px-4 py-3 text-sm text-[#AE4A26]">
            {localError}
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-[#70675F] mb-1.5">
            URL du projet Supabase
          </label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://votre-projet.supabase.co"
            className="w-full min-h-[46px] rounded-xl border border-[#EAE5DD] bg-[#FAF8F5] px-3.5 py-2 text-sm text-[#26211D] focus:border-[#C85A32] focus:bg-white focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-[#70675F] mb-1.5">
            Clé Anon (publishable key)
          </label>
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={anonKey}
              onChange={(e) => setAnonKey(e.target.value)}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              className="w-full min-h-[46px] rounded-xl border border-[#EAE5DD] bg-[#FAF8F5] pl-3.5 pr-11 py-2 text-sm text-[#26211D] focus:border-[#C85A32] focus:bg-white focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setShowKey((prev) => !prev)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-[#70675F] hover:text-[#26211D]"
              aria-label={showKey ? 'Masquer la clé' : 'Afficher la clé'}
            >
              {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-[#70675F] mb-1.5">
            Code carnet (identique sur votre PC et votre iPhone)
          </label>
          <input
            type="text"
            value={notebookCode}
            onChange={(e) => setNotebookCode(e.target.value)}
            placeholder="Ex : cuisine-famille-2026"
            className="w-full min-h-[46px] rounded-xl border border-[#EAE5DD] bg-[#FAF8F5] px-3.5 py-2 text-sm text-[#26211D] focus:border-[#C85A32] focus:bg-white focus:outline-none"
          />
        </div>

        <div className="pt-1">
          <button
            type="submit"
            disabled={isTesting}
            className="inline-flex min-h-[46px] w-full sm:w-auto items-center justify-center gap-2 rounded-2xl bg-[#C85A32] px-6 py-2.5 text-sm font-semibold text-white shadow-soft hover:bg-[#AE4A26] disabled:opacity-60 transition"
          >
            {isTesting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            <span>Tester et synchroniser</span>
          </button>
        </div>

        {/* Mini-guide pliable */}
        <div className="border-t border-[#F3EFE8] pt-3">
          <button
            type="button"
            onClick={() => setShowGuide((prev) => !prev)}
            className="flex w-full items-center justify-between text-left text-xs font-semibold text-[#70675F] hover:text-[#26211D]"
          >
            <span>Comment configurer Supabase en 1 minute ?</span>
            {showGuide ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>

          {showGuide && (
            <ol className="mt-3 space-y-2 rounded-2xl bg-[#FAF8F5] p-4 text-xs leading-relaxed text-[#70675F] list-decimal list-inside">
              <li>
                Créez un projet gratuit sur Supabase, puis ouvrez{' '}
                <strong className="text-[#26211D]">SQL Editor</strong> et exécutez le contenu du fichier{' '}
                <code className="rounded bg-white px-1.5 py-0.5 text-[#C85A32]">
                  supabase_setup.sql
                </code>
                .
              </li>
              <li>
                Dans <strong className="text-[#26211D]">Project Settings → API</strong>, copiez l’URL du projet et la clé{' '}
                <code className="rounded bg-white px-1.5 py-0.5 text-[#26211D]">
                  anon / publishable
                </code>
                .
              </li>
              <li>
                Choisissez un <strong className="text-[#26211D]">Code carnet</strong> personnel et saisissez les mêmes informations sur votre PC et votre iPhone.
              </li>
            </ol>
          )}
        </div>
      </form>

      {/* Sauvegarde & Restauration JSON */}
      <div className="rounded-3xl border border-[#EAE5DD] bg-white p-5 sm:p-6 shadow-soft space-y-4">
        <div>
          <h3 className="font-serif text-lg font-semibold text-[#26211D]">
            Sauvegarde locale (JSON)
          </h3>
          <p className="mt-1 text-xs text-[#70675F]">
            Filet de sécurité : exportez ou importez l’ensemble de vos recettes et courses en un fichier.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={handleExportJson}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl border border-[#EAE5DD] bg-[#FAF8F5] px-5 py-2.5 text-sm font-semibold text-[#26211D] hover:border-[#C85A32]/40 hover:bg-[#F3EFE8] transition"
          >
            <Download className="h-4 w-4 text-[#C85A32]" />
            <span>Exporter mes recettes (JSON)</span>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleImportFile}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl border border-[#EAE5DD] bg-white px-5 py-2.5 text-sm font-semibold text-[#26211D] hover:border-[#4A7C59]/40 hover:bg-[#4A7C59]/5 transition"
          >
            <Upload className="h-4 w-4 text-[#4A7C59]" />
            <span>Importer une sauvegarde (JSON)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
