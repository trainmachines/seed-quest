export interface Acronym {
  /** Exact text to match, case-sensitive. Longer tokens win. */
  token: string;
  /** Glossary id. Story terms point at the existing entry. */
  id: string;
  expansion: string;
  /** One plain-English sentence. */
  plain: string;
  /** Why a founder cares. One sentence. */
  why: string;
  example: string;
  /** Always in the glossary, even if no scene unlocks it. */
  reference?: boolean;
}

export const ACRONYMS: Acronym[] = [
  {
    token: 'NVCA',
    id: 'nvca',
    expansion: 'National Venture Capital Association',
    plain: 'The group that publishes the model documents most US venture rounds use.',
    why: '“Standard NVCA” means the stock purchase, investors’ rights, voting, and ROFR forms your lawyer starts from.',
    example: 'Kindling’s seed closes on those forms, not a one-off contract from a blog.',
    reference: true,
  },
  {
    token: 'QSBS',
    id: 'qsbs',
    expansion: 'Qualified Small Business Stock',
    plain: 'Section 1202 stock in a C-corp that may exclude gain from tax if many tests and a five-year hold are met.',
    why: 'It is a reason investors prefer C-corps. It is not automatic, and it is not a reason to skip a tax advisor.',
    example: 'A founder who holds C-corp stock for years might ask about QSBS. An LLC interest is not QSBS.',
  },
  {
    token: 'SAFE',
    id: 'safe',
    expansion: 'Simple Agreement for Future Equity',
    plain: 'The investor pays now and receives stock later, usually in the priced round. It is not a loan.',
    why: 'Pre-seed rounds use it because it is faster than setting a price. The cap, an MFN, and a side letter still change your ownership.',
    example: 'Harbor wires $200k on a SAFE. They own no shares today. They convert when the seed is priced.',
  },
  {
    token: 'MFN',
    id: 'mfn',
    expansion: 'Most favored nation',
    plain: 'A SAFE holder can take better terms you later give another SAFE investor.',
    why: 'A later, cheaper cap can raise an earlier investor’s percent. The number you wrote down can move.',
    example: 'Harbor has MFN and a $6M cap. Mina later gets a $5M cap. Harbor’s cap drops, and your percent follows.',
  },
  {
    token: 'ROFR',
    id: 'rofr',
    expansion: 'Right of first refusal',
    plain: 'The company, then major investors, can buy a founder’s shares before an outsider does.',
    why: 'It blocks a quiet sale to a stranger. In the NVCA set it travels with the co-sale right.',
    example: 'You want to sell 1% to a friend. The company can step in and buy that 1% on the same terms.',
  },
  {
    token: 'SPA',
    id: 'stock-purchase-agreement',
    expansion: 'Stock Purchase Agreement',
    plain: 'The contract where investors buy the preferred stock.',
    why: 'The term sheet is a summary. This document has the price, the promises, and the closing conditions.',
    example: 'Kindling buys the preferred stock under the SPA once the charter is filed and the signatures are in.',
  },
  {
    token: 'IRA',
    id: 'investors-rights-agreement',
    expansion: 'Investors’ Rights Agreement',
    plain: 'The NVCA contract for who gets financials, registration rights, and pro rata. Not a retirement account.',
    why: '“Major investor” is defined here. A low dollar threshold lets tiny checks demand the same rights as the lead.',
    example: 'The IRA says major investors put in at least $100k. A $25k SAFE does not clear it unless a side letter says so.',
  },
  {
    token: '83(b)',
    id: '83b',
    expansion: 'Section 83(b) election',
    plain: 'A letter asking the IRS to tax restricted stock now, while it is cheap, instead of as it vests.',
    why: 'It is due 30 days after the stock is issued. There is no extension. Miss it and later vesting can be taxed as income.',
    example: 'Stock issued March 1 must be filed by March 31. April 1 is late. Keep the proof.',
  },
  {
    token: 'Form D',
    id: 'form-d',
    expansion: 'SEC Form D',
    plain: 'A notice to the SEC after you sell securities in a private round. It is not an approval.',
    why: 'It is due within 15 days of the first sale. Late notices annoy diligence. Filing it does not bless the sale.',
    example: 'The first SAFE is sold on May 1. Form D wants to be filed by May 16.',
  },
  {
    token: 'SEC',
    id: 'sec',
    expansion: 'Securities and Exchange Commission',
    plain: 'The US agency that regulates sales of stock and other securities.',
    why: 'Form D is a notice to this agency. Your lawyer, not a group chat, decides which exemption you are using.',
    example: 'The seed is a private sale under the securities laws. The SEC still wants the notice.',
    reference: true,
  },
  {
    token: 'IRS',
    id: 'irs',
    expansion: 'Internal Revenue Service',
    plain: 'The US agency that collects federal taxes.',
    why: 'The 83(b) election goes to the IRS. Option prices that ignore fair market value become a tax problem with them.',
    example: 'You mail the 83(b) to the IRS and keep a copy. A note to yourself is not a filing.',
    reference: true,
  },
  {
    token: 'LLC',
    id: 'llc',
    expansion: 'Limited liability company',
    plain: 'A flexible company that is usually taxed as a partnership, not as a corporation.',
    why: 'Most seed funds will not lead a priced round into an LLC. Converting later costs time, fees, and a new 83(b) clock.',
    example: 'Biscuit is an LLC. Kindling will talk, and they will not close the seed that way.',
    reference: true,
  },
  {
    token: 'C-corp',
    id: 'c-corp',
    expansion: 'C corporation',
    plain: 'A corporation taxed under Subchapter C. The company pays tax on profits, and owners can pay tax again on dividends.',
    why: 'US venture documents, option plans, and QSBS are built for this. Investors expect a Delaware one.',
    example: 'Kindling’s counsel asks for a Delaware C-corp before they will price the round.',
    reference: true,
  },
  {
    token: 'IP',
    id: 'ip',
    expansion: 'Intellectual property',
    plain: 'The code, designs, names, and other work the company is supposed to own.',
    why: 'Investors buy the company that owns the product. A contractor who never assigned the prototype can stall the round.',
    example: 'Pete wrote the first version and went hiking. Until he assigns it, the IP is not clearly the company’s.',
    reference: true,
  },
  {
    token: 'CIIAA',
    id: 'ciiaa',
    expansion: 'Confidential Information and Invention Assignment Agreement',
    plain: 'The contract that says the company owns what founders and employees create, and that they will keep secrets.',
    why: 'Without it, the person might still own the work. Investors ask for a signed one from everyone who built the product.',
    example: 'You sign a CIIAA on day one and list any prior inventions you are keeping.',
  },
  {
    token: 'PIIA',
    id: 'piia',
    expansion: 'Proprietary Information and Invention Assignment Agreement',
    plain: 'Another name for a CIIAA. Same job: the company owns the work, and secrets stay inside.',
    why: 'A lawyer might say PIIA and the data room might say CIIAA. Treat them as the same missing signature until you read the page.',
    example: 'The offer letter calls it a PIIA. The folder is labeled CIIAA. You still need the signed page.',
    reference: true,
  },
  {
    token: 'KYC',
    id: 'kyc',
    expansion: 'Know Your Customer',
    plain: 'Identity checks a bank or fund runs before it will take or send money.',
    why: 'A wire can wait on a passport scan and a company address. It is paperwork, not a term-sheet fight.',
    example: 'The bank will not open the account until KYC clears, even after the round is “done.”',
    reference: true,
  },
  {
    token: 'ESOP',
    id: 'esop',
    expansion: 'Employee stock ownership plan',
    plain: 'A retirement plan that holds company stock. Startup people often say this when they mean the option pool.',
    why: 'The seed pool is usually an equity incentive plan, not a true ESOP. The wrong name confuses the cap table and the tax.',
    example: 'A lead says “10% ESOP.” Ask whether they mean the option pool. At seed, they almost always do.',
    reference: true,
  },
  {
    token: 'FMV',
    id: 'fmv',
    expansion: 'Fair market value',
    plain: 'What a willing buyer would pay a willing seller. It is not the tiny par value in the charter.',
    why: 'The 83(b) bet is that today’s value is low. Employee options have to be priced at this value.',
    example: 'Par can be a fraction of a cent. Two years later, FMV for common might be $0.40. Those are different numbers.',
  },
  {
    token: '409A',
    id: '409a',
    expansion: 'Section 409A',
    plain: 'The tax rule that employee options be priced at fair market value, usually from an outside appraisal.',
    why: 'A cheap strike price can create a tax bill. Founder stock bought at the start is a different moment.',
    example: 'Before the first option grants, you commission a 409A. The strike price matches that value.',
  },
  {
    token: 'VC',
    id: 'vc',
    expansion: 'Venture capital',
    plain: 'A fund that buys startup equity and needs a large outcome to pay back its own investors.',
    why: 'A VC lead sets the price, runs diligence, and usually takes a board seat. A pile of small checks is not the same thing.',
    example: 'Kindling is a VC lead. Twelve angels with no one setting terms are a party round.',
    reference: true,
  },
  {
    token: 'LP',
    id: 'lp',
    expansion: 'Limited partner',
    plain: 'An investor in a venture fund. They supply the fund’s money and stay in the background.',
    why: 'Your VC’s LP is not your stockholder. They do not sit on your board, and you do not negotiate the term sheet with them.',
    example: 'A pension fund can be an LP in Kindling. Biscuit’s investor is Kindling, not the pension fund.',
    reference: true,
  },
  {
    token: 'GP',
    id: 'gp',
    expansion: 'General partner',
    plain: 'A manager of a venture fund. This is the person who can bind the fund.',
    why: 'The GP decides whether the fund leads. An associate’s enthusiasm is not the GP’s signature.',
    example: 'The associate loves the demo. The GP still has to approve the check.',
    reference: true,
  },
  {
    token: 'ARR',
    id: 'arr',
    expansion: 'Annual recurring revenue',
    plain: 'One year of subscription revenue, if customers keep paying.',
    why: 'Investors use it as a speedometer. A one-time project fee is not ARR, and the deck gets checked.',
    example: '$10k of monthly subscriptions is about $120k of ARR. A $10k pilot that ends is not.',
    reference: true,
  },
  {
    token: 'MRR',
    id: 'mrr',
    expansion: 'Monthly recurring revenue',
    plain: 'One month of subscription revenue.',
    why: 'ARR is usually MRR times 12, and only if the contracts actually recur.',
    example: 'Three customers paying $2k a month is $6k of MRR. Losing one of them shows up next month.',
    reference: true,
  },
  {
    token: 'TAM',
    id: 'tam',
    expansion: 'Total addressable market',
    plain: 'The full revenue if you won every customer in the market you claim.',
    why: 'A giant TAM does not mean you can reach it. Investors want the slice you can sell in the next few years.',
    example: '“Every dog owner on earth” is a TAM slide. The customers you can reach this year are the real number.',
    reference: true,
  },
  {
    token: 'ACV',
    id: 'acv',
    expansion: 'Annual contract value',
    plain: 'The yearly price of one customer’s contract.',
    why: 'It says how big each sale is. A $500 ACV and a $50,000 ACV are different companies, even at the same revenue.',
    example: 'Ten customers at a $12k ACV is a different sales motion than a thousand customers at $120.',
    reference: true,
  },
  {
    token: 'EIN',
    id: 'ein',
    expansion: 'Employer Identification Number',
    plain: 'The company’s tax number, issued by the IRS.',
    why: 'Banks and payroll ask for it before you can hire or open the company account.',
    example: 'The bank’s application stops until the EIN letter is in the folder.',
    reference: true,
  },
  {
    token: 'DE',
    id: 'de',
    expansion: 'Delaware',
    plain: 'The US state whose corporate law venture deals are written for.',
    why: '“A DE C-corp” is the entity investors expect. Another state usually means a conversion before a priced round.',
    example: 'The charter is a Delaware filing. “DE” on the cap table means that company, not a placeholder.',
    reference: true,
  },
  {
    token: 'PDF',
    id: 'pdf',
    expansion: 'Portable Document Format',
    plain: 'The file you actually sign and send.',
    why: 'Diligence reads the PDF, not the deal you remember from coffee. A side letter in the file is in the deal.',
    example: 'Counsel sends back a six-month-old PDF of the good-standing certificate and asks for a new one.',
    reference: true,
  },
  {
    token: 'HR',
    id: 'hr',
    expansion: 'Human resources',
    plain: 'Hiring, pay, and the people paperwork.',
    why: 'Investors look here for who works for the company, who was promised equity, and who signed an IP assignment.',
    example: 'The HR folder should match the cap table: employees, contractors, and anyone with a promised grant.',
    reference: true,
  },
  {
    token: 'YC',
    id: 'yc',
    expansion: 'Y Combinator',
    plain: 'The accelerator that publishes the post-money SAFE this game uses.',
    why: '“YC SAFE” means that standard form. An MFN or a side letter means it is no longer the untouched form.',
    example: 'Harbor asks for the YC post-money SAFE, then clips a side letter to the PDF.',
    reference: true,
  },
  {
    token: 'GPL',
    id: 'gpl',
    expansion: 'GNU General Public License',
    plain: 'A copyleft open-source license. Shipping it inside a closed product can force you to share your own source.',
    why: 'A GPL dependency in the repo is a common diligence surprise. Your lawyer decides whether it fits the product.',
    example: 'The build pulls in a GPL library. Counsel asks whether the product can stay closed.',
    reference: true,
  },
  {
    token: 'GNU',
    id: 'gnu',
    expansion: 'GNU’s Not Unix',
    plain: 'The project name in front of the General Public License.',
    why: 'You meet it inside “GPL.” The diligence issue is the license, not the name.',
    example: 'The license header says GNU. The question for the round is what that license requires you to share.',
    reference: true,
  },
  {
    token: 'CPA',
    id: 'cpa',
    expansion: 'Certified public accountant',
    plain: 'An accountant licensed to sign off on books and tax positions.',
    why: 'The 83(b), the 409A, and the option paperwork are tax questions. A CPA is who you ask.',
    example: 'The CPA is out for ten days. The 83(b) deadline does not move with their calendar.',
    reference: true,
  },
  {
    token: 'US',
    id: 'us',
    expansion: 'United States',
    plain: 'The country whose corporate, securities, and tax rules this game uses.',
    why: 'Delaware corporations, SEC notices, and IRS elections are US machinery. Another country uses different documents.',
    example: 'This story is a US seed round. A different country would not start from the NVCA forms.',
    reference: true,
  },
  {
    token: 'LOI',
    id: 'loi',
    expansion: 'Letter of intent',
    plain: 'A short note that a customer might buy. It is usually not a binding contract.',
    why: 'An LOI is a signal, not revenue and not ARR. Diligence will ask what is signed and what is a maybe.',
    example: 'A customer LOI goes in the folder. It does not go in the revenue line.',
    reference: true,
  },
];

/** Uppercase tokens that are not founder jargon. DOM tag names only. */
export const ACRONYM_ALLOWLIST = new Set<string>(['INPUT', 'TEXTAREA']);

const byToken = new Map(ACRONYMS.map((entry) => [entry.token, entry]));

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const tokenPattern = [...ACRONYMS]
  .sort((a, b) => b.token.length - a.token.length)
  .map((entry) => escapeRegExp(entry.token))
  .join('|');

export interface AcronymTextPart {
  kind: 'text';
  text: string;
}

export interface AcronymMarkPart {
  kind: 'acronym';
  shown: string;
  token: string;
  expansion: string;
  plain: string;
  why: string;
  id: string;
  spellOut: boolean;
}

export type AcronymPart = AcronymTextPart | AcronymMarkPart;

export function annotateAcronyms(text: string, seen: Set<string>, expand: boolean): AcronymPart[] {
  if (!text) return [];
  const re = new RegExp(`(?<![A-Za-z0-9])(${tokenPattern})`, 'g');
  const parts: AcronymPart[] = [];
  let last = 0;
  for (const match of text.matchAll(re)) {
    const index = match.index ?? 0;
    const token = match[1] ?? '';
    const acronym = byToken.get(token);
    if (!acronym) continue;
    let end = index + token.length;
    let shown = token;
    const next = text[end] ?? '';
    const after = text[end + 1] ?? '';
    if (/[A-Za-z0-9]/.test(next)) {
      if (next === 's' && !/[A-Za-z0-9]/.test(after)) {
        shown += 's';
        end += 1;
      } else {
        continue;
      }
    }
    if (index > last) parts.push({ kind: 'text', text: text.slice(last, index) });
    const tail = text.slice(end);
    const already = tail.startsWith(` (${acronym.expansion})`) || tail.startsWith(`(${acronym.expansion})`);
    const spellOut = expand && !seen.has(acronym.token) && !already;
    if (expand) seen.add(acronym.token);
    parts.push({
      kind: 'acronym',
      shown,
      token: acronym.token,
      expansion: acronym.expansion,
      plain: acronym.plain,
      why: acronym.why,
      id: acronym.id,
      spellOut,
    });
    last = end;
  }
  if (last < text.length) parts.push({ kind: 'text', text: text.slice(last) });
  if (!parts.length) parts.push({ kind: 'text', text });
  return parts;
}
