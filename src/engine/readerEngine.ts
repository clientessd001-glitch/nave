import type { AdBlockConfig } from '../types/browser';
import {
  BUILTIN_EASYLIST_RULES,
  extractDomain,
  matchesDomainRule,
  normalizeCustomRuleToDomain,
  normalizeNavigationInput,
} from './adblockEngine';

export interface DistilledBlock {
  type: 'heading' | 'paragraph' | 'code' | 'table-row';
  text: string;
}

export interface DistilledArticle {
  title: string;
  metaLine: string;
  blocks: DistilledBlock[];
  keyTakeaways: string[];
  wordCount: number;
  readingTimeMinutes: number;
  markdown: string;
}

function stripTagsToPlainText(htmlFragment: string): string {
  return htmlFragment
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

export function distillArticleForReader(rawOrSanitizedHtml: string, fallbackTitle: string): DistilledArticle {
  const withoutScriptsAndStyles = rawOrSanitizedHtml
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '');

  const h1Match = withoutScriptsAndStyles.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const title = h1Match ? stripTagsToPlainText(h1Match[1]) : fallbackTitle;

  const metaMatch = withoutScriptsAndStyles.match(/<div[^>]*class=["'][^"']*meta[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);
  const metaLine = metaMatch ? stripTagsToPlainText(metaMatch[1]) : 'Modo Leitor Editorial · Veloce';

  const blocks: DistilledBlock[] = [];
  const tokenRegex = /<(h2|p|pre|tr)\b[^>]*>([\s\S]*?)<\/\1>/gi;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(withoutScriptsAndStyles)) !== null) {
    const tag = match[1].toLowerCase();
    const inner = match[2];

    if (tag === 'h2') {
      const text = stripTagsToPlainText(inner);
      if (text) blocks.push({ type: 'heading', text });
    } else if (tag === 'p') {
      const text = stripTagsToPlainText(inner);
      if (text) blocks.push({ type: 'paragraph', text });
    } else if (tag === 'pre') {
      const codeText = inner
        .replace(/<[^>]+>/g, '')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .trim();
      if (codeText) blocks.push({ type: 'code', text: codeText });
    } else if (tag === 'tr') {
      const cells: string[] = [];
      const cellRegex = /<(?:td|th)\b[^>]*>([\s\S]*?)<\/(?:td|th)>/gi;
      let cellMatch: RegExpExecArray | null;
      while ((cellMatch = cellRegex.exec(inner)) !== null) {
        const cellText = stripTagsToPlainText(cellMatch[1]);
        if (cellText) cells.push(cellText);
      }
      if (cells.length >= 2) {
        blocks.push({ type: 'table-row', text: cells.join(' · ') });
      }
    }
  }

  const keyTakeaways = blocks
    .filter((b) => b.type === 'paragraph' && b.text.length > 40)
    .slice(0, 3)
    .map((b) => {
      const firstSentence = b.text.split('. ')[0];
      return firstSentence.endsWith('.') ? firstSentence : `${firstSentence}.`;
    });

  const allWords = [title, ...blocks.map((b) => b.text)]
    .join(' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const wordCount = allWords.length;
  const readingTimeMinutes = Math.max(1, Math.round(wordCount / 190));

  const mdLines: string[] = [
    `# ${title}`,
    `_${metaLine}_`,
    '',
  ];

  for (const b of blocks) {
    if (b.type === 'heading') {
      mdLines.push(`## ${b.text}`, '');
    } else if (b.type === 'paragraph') {
      mdLines.push(b.text, '');
    } else if (b.type === 'code') {
      mdLines.push('```kotlin', b.text, '```', '');
    } else if (b.type === 'table-row') {
      mdLines.push(`- ${b.text}`);
    }
  }

  return {
    title,
    metaLine,
    blocks,
    keyTakeaways,
    wordCount,
    readingTimeMinutes,
    markdown: mdLines.join('\n').trim(),
  };
}

export function countTextOccurrences(blocks: DistilledBlock[], query: string): number {
  const clean = query.trim().toLowerCase();
  if (!clean) return 0;
  let total = 0;
  for (const block of blocks) {
    const textLower = block.text.toLowerCase();
    let idx = 0;
    while ((idx = textLower.indexOf(clean, idx)) !== -1) {
      total += 1;
      idx += clean.length;
    }
  }
  return total;
}

export interface UrlDiagnosticResult {
  originalInput: string;
  cleanedUrl: string;
  domain: string;
  strippedParams: string[];
  isBlockedDomain: boolean;
  matchedRule: string | null;
  matchedCategory: string | null;
  dohEndpoint: string;
}

const DOH_ENDPOINTS: Record<AdBlockConfig['dohProvider'], string> = {
  quad9: 'https://dns.quad9.net/dns-query (9.9.9.9 · Bloqueio de malware)',
  cloudflare: 'https://cloudflare-dns.com/dns-query (1.1.1.1 · Baixa latência)',
  adguard: 'https://dns.adguard-dns.com/dns-query (Filtro DNS de anúncios)',
  nextdns: 'https://dns.nextdns.io/veloce-shield (Perfil zero telemetria)',
};

export function diagnoseUrlSecurity(
  rawUrlInput: string,
  adBlock: AdBlockConfig
): UrlDiagnosticResult {
  const norm = normalizeNavigationInput(rawUrlInput, true);
  const domain = extractDomain(norm.normalizedUrl);

  let isBlockedDomain = false;
  let matchedRule: string | null = null;
  let matchedCategory: string | null = null;

  for (const rule of BUILTIN_EASYLIST_RULES) {
    if (matchesDomainRule(norm.normalizedUrl, rule.domainMatch)) {
      isBlockedDomain = true;
      matchedRule = rule.pattern;
      matchedCategory = rule.category;
      break;
    }
  }

  if (!isBlockedDomain) {
    for (const custom of adBlock.customRules) {
      const parsed = normalizeCustomRuleToDomain(custom);
      if (parsed && matchesDomainRule(norm.normalizedUrl, parsed)) {
        isBlockedDomain = true;
        matchedRule = custom;
        matchedCategory = 'Regra personalizada';
        break;
      }
    }
  }

  return {
    originalInput: rawUrlInput.trim(),
    cleanedUrl: norm.normalizedUrl,
    domain,
    strippedParams: norm.strippedParams,
    isBlockedDomain,
    matchedRule,
    matchedCategory,
    dohEndpoint: DOH_ENDPOINTS[adBlock.dohProvider],
  };
}
