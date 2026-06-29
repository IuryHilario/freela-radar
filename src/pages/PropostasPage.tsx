import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { FileText, ExternalLink, FolderOpen, RotateCw, X, Trash2 } from 'lucide-react';
import { api } from '../ipc/api';
import type { Proposta } from '../ipc/api';
import { cn, guessPlatformFromUrl, prettyPlatform } from '../lib/utils';
import { PlatformIcon } from '../components/PlatformIcon';
import { TagChip } from '../components/TagChip';

export function PropostasPage() {
  const [propostas, setPropostas] = useState<Proposta[]>([]);
  const [loading, setLoading] = useState(true);
  const [openProposta, setOpenProposta] = useState<Proposta | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      setPropostas(await api.opportunities.listPropostas());
    } catch (e) {
      console.warn('[PropostasPage] listPropostas falhou:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (proposta: Proposta) => {
    if (!window.confirm(`Excluir a proposta "${proposta.title}"?\n\nEsta ação não pode ser desfeita.`)) return;
    const r = await api.opportunities.deleteProposta(proposta.filePath);
    if (!r.ok) {
      window.alert(`Falha ao excluir: ${r.error}`);
      return;
    }
    if (openProposta?.filePath === proposta.filePath) setOpenProposta(null);
    setPropostas((prev) => prev.filter((p) => p.filePath !== proposta.filePath));
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto px-8 py-7">
        <header className="flex items-start justify-between gap-4 mb-6">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-soft text-purple grid place-items-center shrink-0">
              <FileText size={18} strokeWidth={2.4} />
            </div>
            <div>
              <h1 className="text-[20px] font-bold text-primary leading-tight">Propostas</h1>
              <p className="text-[13px] text-secondary mt-0.5">
                Documentos que o time de agentes entregou para cada oportunidade.
              </p>
            </div>
          </div>
          <button
            onClick={load}
            disabled={loading}
            title="Recarregar propostas"
            aria-label="Recarregar propostas"
            className="w-9 h-9 rounded-lg border border-border bg-white grid place-items-center text-secondary hover:bg-[#f8f8fb] disabled:opacity-50 transition shrink-0"
          >
            <RotateCw size={15} className={cn(loading && 'animate-spin')} />
          </button>
        </header>

        {propostas.length === 0 ? (
          <div className="bg-card rounded-2xl border border-border p-10 text-center text-secondary">
            <FileText size={32} className="mx-auto mb-3 text-muted" />
            <p className="text-[14px]">
              {loading
                ? 'Carregando…'
                : 'Nenhuma proposta gerada ainda — execute o time de agentes em uma oportunidade no Radar.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {propostas.map((p) => (
              <PropostaCard
                key={p.opportunityId}
                proposta={p}
                onView={() => setOpenProposta(p)}
                onDelete={() => handleDelete(p)}
              />
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {openProposta && (
          <PropostaModal
            proposta={openProposta}
            onClose={() => setOpenProposta(null)}
            onDelete={() => handleDelete(openProposta)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function PropostaCard({ proposta, onView, onDelete }: { proposta: Proposta; onView: () => void; onDelete: () => void }) {
  const platformSlug = guessPlatformFromUrl(proposta.sourceUrl);
  const sourceLabel = prettyPlatform(platformSlug);
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="bg-card rounded-2xl border border-border p-4 shadow-card hover:shadow-cardHover transition-shadow flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <PlatformIcon platform={platformSlug} />
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-semibold text-primary leading-snug line-clamp-2" title={proposta.title}>
            {proposta.title}
          </div>
          <div className="text-[12px] text-muted mt-1">
            {sourceLabel}
            {proposta.generatedAt ? ` · ${proposta.generatedAt}` : ''}
          </div>
        </div>
      </div>

      {proposta.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {proposta.tags.slice(0, 4).map((t) => (
            <TagChip key={t} variant="purple">
              {t}
            </TagChip>
          ))}
        </div>
      )}

      <div className="text-[12.5px] text-secondary">{proposta.budgetLine}</div>

      {/* Confirmação inline de exclusão */}
      <AnimatePresence>
        {confirming && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="rounded-xl border border-[#f3c2c2] bg-[#fdf2f2] px-3 py-2.5 flex items-center justify-between gap-3"
          >
            <span className="text-[12.5px] text-[#b91c1c] font-medium leading-snug">
              Excluir esta proposta?
            </span>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="h-7 px-2.5 rounded-lg border border-border bg-white text-[12px] font-medium text-primary hover:bg-[#f8f8fb] transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => { setConfirming(false); onDelete(); }}
                className="h-7 px-2.5 rounded-lg bg-[#b91c1c] text-white text-[12px] font-medium hover:bg-[#991b1b] transition"
              >
                Excluir
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-auto pt-2 flex items-center gap-2">
        <button
          type="button"
          onClick={onView}
          className="flex-1 h-9 rounded-xl bg-purple text-white text-[13px] font-semibold hover:opacity-90 transition flex items-center justify-center gap-1.5"
        >
          <FileText size={14} /> Ver proposta
        </button>
        {proposta.sourceUrl && (
          <a
            href={proposta.sourceUrl}
            target="_blank"
            rel="noreferrer"
            title="Ver vaga original"
            aria-label="Ver vaga original"
            className="w-9 h-9 rounded-xl border border-border bg-white grid place-items-center text-primary hover:bg-[#f8f8fb] transition shrink-0"
          >
            <ExternalLink size={14} />
          </a>
        )}
        <button
          type="button"
          onClick={() => setConfirming((v) => !v)}
          title="Excluir proposta"
          aria-label="Excluir proposta"
          className={cn(
            'w-9 h-9 rounded-xl border bg-white grid place-items-center transition shrink-0',
            confirming
              ? 'border-[#f3c2c2] text-[#b91c1c] bg-[#fdf2f2]'
              : 'border-border text-secondary hover:text-[#b91c1c] hover:bg-[#fdf2f2] hover:border-[#f3c2c2]',
          )}
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

function PropostaModal({ proposta, onClose, onDelete }: { proposta: Proposta; onClose: () => void; onDelete: () => void }) {
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setContent(null);
    setError(null);
    api.opportunities.readProposta(proposta.filePath).then((r) => {
      if (!active) return;
      if (r.ok) setContent(r.content ?? '');
      else setError(r.error ?? 'Falha ao ler o arquivo.');
    });
    return () => {
      active = false;
    };
  }, [proposta.filePath]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const openFile = async () => {
    const err = await api.app.openPath(proposta.filePath);
    if (err) window.alert(`Não foi possível abrir o arquivo: ${err}`);
  };

  const openFolder = async () => {
    const ok = await api.app.showItemInFolder(proposta.filePath);
    if (!ok) window.alert('Não foi possível abrir a pasta do arquivo.');
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      onClick={onClose}
      className="fixed inset-0 z-[55] grid place-items-center bg-black/40 backdrop-blur-sm p-6"
    >
      <motion.div
        initial={{ scale: 0.96, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.97, opacity: 0 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        onClick={(e) => e.stopPropagation()}
        className="bg-card rounded-2xl border border-border shadow-cardHover w-full max-w-[720px] max-h-[85vh] flex flex-col"
      >
        <div className="flex items-start gap-3 p-5 border-b border-border">
          <div className="min-w-0 flex-1">
            <h2 className="text-[16px] font-bold text-primary leading-snug">{proposta.title}</h2>
            <div className="text-[12px] text-muted mt-1 font-mono truncate" title={proposta.fileName}>
              {proposta.fileName}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="w-7 h-7 rounded-md grid place-items-center text-muted hover:text-primary hover:bg-[#f5f5f7] transition shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-4 overflow-y-auto flex-1">
          {error ? (
            <p className="text-[13px] text-[#b91c1c]">{error}</p>
          ) : content == null ? (
            <p className="text-[13px] text-muted italic">Carregando…</p>
          ) : (
            <div className="prose prose-sm max-w-none prose-headings:text-primary prose-p:text-primary prose-li:text-primary prose-strong:text-primary prose-a:text-purple">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-border flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={openFolder}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl border border-border bg-white text-[13px] font-medium text-primary hover:bg-[#f8f8fb] transition"
          >
            <FolderOpen size={14} /> Pasta
          </button>
          <button
            type="button"
            onClick={openFile}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl border border-border bg-white text-[13px] font-medium text-primary hover:bg-[#f8f8fb] transition"
          >
            <ExternalLink size={14} /> Abrir arquivo
          </button>
          <div className="w-px h-5 bg-border mx-1" aria-hidden="true" />
          <button
            type="button"
            onClick={onDelete}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl border border-[#f3c2c2] bg-white text-[13px] font-medium text-[#b91c1c] hover:bg-[#fdf2f2] transition"
          >
            <Trash2 size={14} /> Excluir
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
