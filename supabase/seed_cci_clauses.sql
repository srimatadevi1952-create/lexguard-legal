-- =============================================================================
-- Seed: CCI Assessments (5) + 50 Global Clauses + 2 Org-Private Clauses
-- Run AFTER migrations AND after demo org (democorp) is created.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- CCI Assessments — 5 demo records for democorp
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_org_id UUID;
BEGIN
  SELECT id INTO v_org_id FROM public.organizations WHERE slug = 'democorp' LIMIT 1;
  IF v_org_id IS NULL THEN RAISE NOTICE 'democorp org not found — skipping CCI seed'; RETURN; END IF;

  INSERT INTO public.cci_assessments (
    org_id, acquirer_name, acquirer_assets_india, acquirer_assets_worldwide,
    acquirer_turnover_india, acquirer_turnover_worldwide,
    target_name, target_assets_india, target_assets_worldwide,
    target_turnover_india, target_turnover_worldwide, target_india_turnover_pct,
    group_assets_india, group_assets_worldwide, group_turnover_india, group_turnover_worldwide,
    deal_value, transaction_type, verdict, form_type, triggered_tests, exempt_reasons
  ) VALUES
  -- 1. Large horizontal merger — filing required
  (
    v_org_id, 'Reliance Retail Ventures Ltd', 8500, 22000, 12000, 35000,
    'Future Retail Ltd', 1800, 2400, 4200, 5100, 82,
    12500, 36000, 19000, 48000,
    24750, 'acquisition', 'filing_required', 'Form I',
    ARRAY[
      'Combined assets in India >= Rs.2,500 Cr (Rs.10,300 Cr) [Section 5(a)(i)]',
      'Combined turnover in India >= Rs.7,500 Cr (Rs.16,200 Cr) [Section 5(a)(ii)]',
      'Group assets in India >= Rs.10,000 Cr [Section 5(c)(i)]',
      'Group turnover in India >= Rs.30,000 Cr — below threshold',
      'Deal value > Rs.2,000 Cr (Rs.24,750 Cr) AND target India turnover > 10% of global [Deal Value Threshold, 2024]'
    ],
    ARRAY[]::TEXT[]
  ),
  -- 2. Mid-market acquisition — filing required (combined party test)
  (
    v_org_id, 'HDFC Asset Management Ltd', 3200, 4100, 2800, 3500,
    'Edelweiss Mutual Fund', 1100, 1300, 800, 950, 84,
    4500, 5800, 3700, 4600,
    3800, 'acquisition', 'filing_required', 'Form I',
    ARRAY[
      'Combined assets in India >= Rs.2,500 Cr (Rs.4,300 Cr) [Section 5(a)(i)]',
      'Combined turnover in India >= Rs.7,500 Cr — not met (Rs.3,600 Cr)',
      'Deal value > Rs.2,000 Cr (Rs.3,800 Cr) AND target India turnover > 10% of global [Deal Value Threshold, 2024]'
    ],
    ARRAY[]::TEXT[]
  ),
  -- 3. Cross-border — filing required (worldwide test)
  (
    v_org_id, 'Tata Consultancy Services Ltd', 4800, 18500, 9200, 42000,
    'iGate Corporation (US)', 450, 12400, 320, 9800, 3,
    5500, 32000, 9700, 55000,
    14200, 'acquisition', 'filing_required', 'Form I',
    ARRAY[
      'Combined worldwide assets >= USD 1.25 Bn (Rs.18,950 Cr) AND India assets >= Rs.1,250 Cr [Section 5(b)(i)]',
      'Combined worldwide turnover >= USD 3.75 Bn (Rs.51,800 Cr) AND India turnover >= Rs.3,750 Cr [Section 5(b)(ii)]'
    ],
    ARRAY[]::TEXT[]
  ),
  -- 4. Small startup acquisition — exempt (small target)
  (
    v_org_id, 'Infosys Ltd', 6200, 14800, 11400, 28500,
    'SalesPredict (startup)', 38, 65, 22, 42, 52,
    6300, 15000, 11450, 28600,
    280, 'acquisition', 'exempt', NULL,
    ARRAY['Combined assets in India >= Rs.2,500 Cr (Rs.6,238 Cr) [Section 5(a)(i)]'],
    ARRAY['Small target exemption (Schedule I): target assets in India <= Rs.450 Cr AND turnover in India <= Rs.1,250 Cr']
  ),
  -- 5. Borderline — DVT check required
  (
    v_org_id, 'Zomato Ltd', 1850, 2100, 6800, 7200,
    'Blinkit (quick commerce)', 390, 420, 1180, 1250, 94,
    2300, 2600, 8100, 8600,
    2350, 'acquisition', 'borderline', 'Form I',
    ARRAY[
      'Deal value > Rs.2,000 Cr (Rs.2,350 Cr) AND target India turnover > 10% of global (94%) [Deal Value Threshold, 2024]'
    ],
    ARRAY['Small target exemption (Schedule I): target assets in India <= Rs.450 Cr AND turnover in India <= Rs.1,250 Cr']
  );

END $$;

-- ---------------------------------------------------------------------------
-- 50 Global Clauses
-- ---------------------------------------------------------------------------

-- CONFIDENTIALITY (5) -------------------------------------------------------
INSERT INTO public.clauses (title, category, clause_text_en, clause_text_hi, use_case, risk_notes, party_position, applicable_acts, applicable_contract_types, references, visibility) VALUES

(
  'Mutual Confidentiality — Standard',
  'Confidentiality',
  'CONFIDENTIALITY. Each party (the "Receiving Party") undertakes to keep confidential all information disclosed by the other party (the "Disclosing Party") that is designated as confidential or that, by its nature or the circumstances of disclosure, ought reasonably to be treated as confidential ("Confidential Information"). The Receiving Party shall: (a) use Confidential Information solely for the purpose of performing its obligations under this Agreement; (b) not disclose Confidential Information to any third party without the prior written consent of the Disclosing Party; and (c) apply the same degree of care to protect Confidential Information as it applies to its own confidential information of a like nature, but in no event less than reasonable care. These obligations shall survive termination or expiry of this Agreement for a period of three (3) years.',
  'पारस्परिक गोपनीयता — मानक। प्रत्येक पक्ष ("प्राप्तकर्ता पक्ष") दूसरे पक्ष ("प्रकटकर्ता पक्ष") द्वारा प्रकट की गई सभी गोपनीय सूचनाओं को गोपनीय रखने का वचन देता है। प्राप्तकर्ता पक्ष ऐसी सूचनाओं का उपयोग केवल इस अनुबंध के अंतर्गत अपने दायित्वों को पूरा करने के लिए करेगा तथा पूर्व लिखित सहमति के बिना किसी तृतीय पक्ष को प्रकट नहीं करेगा। यह दायित्व अनुबंध की समाप्ति के पश्चात तीन वर्ष तक प्रभावी रहेगा।',
  'Use in any agreement where both parties will share sensitive information — NDAs, MSAs, technology agreements.',
  'Three-year survival is market-standard. Ensure exclusions (public domain, prior knowledge, independent development) are included in the full NDA schedule.',
  'neutral',
  ARRAY['Indian Contract Act 1872', 'IT Act 2000'],
  ARRAY['NDA', 'MSA', 'Technology Agreement', 'Joint Venture'],
  'Section 27, Indian Contract Act 1872 (restraint of trade — keep obligations reasonable in scope)',
  'global'
),

(
  'One-Way Confidentiality — Disclosing Party Favours',
  'Confidentiality',
  'CONFIDENTIALITY. The Recipient agrees that the Confidential Information disclosed by the Discloser is the exclusive property of the Discloser. The Recipient shall: (a) hold all Confidential Information in strict confidence; (b) not use any Confidential Information for any purpose other than evaluating the Transaction; (c) not disclose any Confidential Information to any person other than its directors, officers, employees, legal advisers, and financial advisers who have a need-to-know and are bound by obligations of confidentiality no less restrictive than those set out herein; (d) immediately notify the Discloser in writing upon discovery of any unauthorised use or disclosure of Confidential Information; and (e) upon demand by the Discloser, promptly destroy or return all tangible embodiments of Confidential Information.',
  'एकतरफा गोपनीयता। प्राप्तकर्ता स्वीकार करता है कि प्रकटकर्ता द्वारा प्रकट की गई गोपनीय सूचना प्रकटकर्ता की विशेष संपत्ति है। प्राप्तकर्ता इसे केवल लेन-देन के मूल्यांकन हेतु उपयोग करेगा और मांग पर सभी भौतिक प्रतियाँ नष्ट या वापस करेगा।',
  'Used in M&A due diligence, vendor evaluation, and fundraising where only one party discloses. Strongly favours the disclosing party.',
  'Do not use in contexts where both parties are disclosing sensitive information — use mutual NDA instead. The return/destroy obligation should not apply to backup archives held in ordinary course.',
  'drafter_favours',
  ARRAY['Indian Contract Act 1872'],
  ARRAY['NDA', 'M&A', 'Due Diligence'],
  NULL,
  'global'
),

(
  'Permitted Disclosure with Prior Written Consent',
  'Confidentiality',
  'PERMITTED DISCLOSURES. Notwithstanding any other provision of this Agreement, the Receiving Party may disclose Confidential Information: (a) to the extent required by applicable law, regulation, or order of a court or governmental authority of competent jurisdiction, provided that the Receiving Party gives the Disclosing Party prompt prior written notice of such requirement (to the extent permitted by law) and cooperates reasonably with the Disclosing Party in seeking a protective order or other appropriate relief; (b) to its legal, financial, or technical advisers who are bound by professional or contractual obligations of confidentiality no less stringent than this clause; or (c) with the prior written consent of the Disclosing Party. Any disclosure under (a) shall be limited to the minimum extent necessary to comply with the applicable requirement.',
  'अनुमत प्रकटीकरण। प्राप्तकर्ता पक्ष गोपनीय सूचना का प्रकटीकरण निम्नलिखित परिस्थितियों में कर सकता है: (क) लागू कानून या न्यायालय के आदेश की आवश्यकता होने पर, यथासंभव पूर्व सूचना देकर; (ख) व्यावसायिक गोपनीयता दायित्व से आबद्ध सलाहकारों को; या (ग) प्रकटकर्ता की पूर्व लिखित सहमति से।',
  'Include in every NDA as a carve-out to the blanket prohibition on disclosure. Critical for listed companies obligated to disclose material information.',
  'The regulator-disclosure carve-out is non-negotiable. Ensure notice obligation is "to the extent permitted by law" — some regulatory orders are issued under confidentiality.',
  'neutral',
  ARRAY['Indian Contract Act 1872', 'SEBI LODR 2015', 'Companies Act 2013'],
  ARRAY['NDA', 'MSA', 'Shareholder Agreement'],
  'SEBI LODR Regulation 30 (disclosure of material events)',
  'global'
),

(
  'Residuals Clause — Counterparty Favours',
  'Confidentiality',
  'RESIDUALS. Notwithstanding the foregoing, the Receiving Party shall not be restricted from using Residuals for any purpose, including without limitation in the development, manufacture, and marketing of its products and services. "Residuals" means information retained in the unaided memory of the Receiving Party''s employees who have had access to the Disclosing Party''s Confidential Information during the course of performing services under this Agreement, without any deliberate memorisation for the purpose of retaining the Confidential Information.',
  'अवशिष्ट सूचना खंड। प्राप्तकर्ता पक्ष को उन सूचनाओं का उपयोग करने से नहीं रोका जाएगा जो उसके कर्मचारियों की अनुत्तेजित स्मृति में बिना जानबूझकर स्मरण किए रह जाती हैं।',
  'Strongly favours the recipient/service provider — particularly technology companies and consultants. Carves out knowledge retained without deliberate effort from confidentiality obligations.',
  'AVOID including this clause unless you represent the receiving party. Disclosing parties should strenuously resist this clause as it creates a practical exception that is nearly impossible to police.',
  'counterparty_favours',
  ARRAY['Indian Contract Act 1872'],
  ARRAY['Technology Agreement', 'Consulting Agreement', 'MSA'],
  NULL,
  'global'
),

(
  'Return or Destruction of Confidential Information',
  'Confidentiality',
  'RETURN OR DESTRUCTION. Upon the earlier of: (a) the Disclosing Party''s written request; or (b) the termination or expiry of this Agreement, the Receiving Party shall promptly (and in any event within ten (10) Business Days): (i) return to the Disclosing Party all tangible materials containing or embodying Confidential Information; or (ii) at the Disclosing Party''s election, destroy all such materials and certify such destruction in writing, except that the Receiving Party may retain one archival copy solely for legal compliance purposes and shall not be required to purge Confidential Information stored in automated backup systems, provided such information is not accessed or used.',
  'गोपनीय सूचना की वापसी या नष्टीकरण। अनुबंध समाप्ति या प्रकटकर्ता के अनुरोध पर, प्राप्तकर्ता दस कार्य-दिवसों के भीतर गोपनीय सूचना की सभी भौतिक प्रतियाँ वापस या नष्ट करेगा और नष्टीकरण का प्रमाण-पत्र देगा।',
  'Standard NDA closing provision. Critical in M&A where deal fails — prevents the losing bidder from using target information.',
  'The backup-systems carve-out is essential and reflects market practice. Without it, counterparty may claim breach every time a backup cycle runs.',
  'drafter_favours',
  ARRAY['Indian Contract Act 1872'],
  ARRAY['NDA', 'M&A', 'Due Diligence'],
  NULL,
  'global'
),

-- IP & LICENSING (5) --------------------------------------------------------
(
  'Work-for-Hire / IP Assignment',
  'IP & Licensing',
  'INTELLECTUAL PROPERTY ASSIGNMENT. The Service Provider hereby irrevocably and unconditionally assigns to the Client, with full title guarantee, all present and future intellectual property rights (including patents, copyrights, trade secrets, designs, and know-how) in and to all deliverables, works, inventions, and developments created, conceived, or reduced to practice by the Service Provider (whether alone or jointly) in connection with the performance of the Services ("Work Product"). The Service Provider waives all moral rights in the Work Product to the fullest extent permitted under applicable law. The Service Provider shall execute such further documents and take such further actions as the Client may reasonably request to perfect or record the assignment.',
  'कार्य-से-नियुक्ति / बौद्धिक संपदा हस्तांतरण। सेवा प्रदाता इस अनुबंध के अंतर्गत बनाई गई सभी कृतियों, आविष्कारों और विकास में सभी वर्तमान और भावी बौद्धिक संपदा अधिकारों को ग्राहक को अपरिवर्तनीय रूप से हस्तांतरित करता है।',
  'Use in technology development, software development, and content creation contracts where client wants to own all IP.',
  'Without this clause, the service provider retains copyright under Section 17 of the Copyright Act 1957. Ensure the clause covers both current and future assignments. Consider a licence-back if service provider needs to use generic tools.',
  'drafter_favours',
  ARRAY['Copyright Act 1957', 'Patents Act 1970', 'Indian Contract Act 1872'],
  ARRAY['Software Development', 'Technology Agreement', 'Consulting Agreement'],
  'Section 17, Copyright Act 1957; Section 6, Patents Act 1970',
  'global'
),

(
  'Non-Exclusive Licence Grant',
  'IP & Licensing',
  'LICENCE GRANT. Subject to the terms and conditions of this Agreement, Licensor hereby grants to Licensee a non-exclusive, non-transferable, non-sublicensable, royalty-bearing licence, for the Territory, during the Term, to: (a) use, copy, and modify the Licensed Technology solely for Licensee''s internal business purposes; and (b) incorporate the Licensed Technology into Licensee''s products and services, provided that such incorporation does not grant any rights in the Licensed Technology to any third party. All rights not expressly granted are reserved to Licensor.',
  'गैर-विशेष लाइसेंस अनुदान। लाइसेंसकर्ता लाइसेंसधारी को, इस अनुबंध के नियमों के अधीन, निर्दिष्ट क्षेत्र और अवधि के लिए, केवल आंतरिक व्यावसायिक उद्देश्यों हेतु लाइसेंसकृत प्रौद्योगिकी के उपयोग, प्रतिलिपि और संशोधन का गैर-विशेष अधिकार प्रदान करता है।',
  'Standard licence for SaaS, software, content, or patent licensing where licensor retains ownership and grants limited rights.',
  'Ensure "Territory" and "Term" are defined. If licence should be perpetual, remove the Term definition. Add audit rights if royalty-bearing.',
  'drafter_favours',
  ARRAY['Copyright Act 1957', 'Patents Act 1970', 'Indian Contract Act 1872'],
  ARRAY['SaaS Agreement', 'Technology Agreement', 'Licensing Agreement'],
  NULL,
  'global'
),

(
  'Pre-Existing IP and Background IP Carve-Out',
  'IP & Licensing',
  'PRE-EXISTING INTELLECTUAL PROPERTY. Each party retains all rights, title, and interest in and to its Pre-Existing IP. "Pre-Existing IP" means any intellectual property that a party owns or has the right to use prior to the commencement date of this Agreement, together with any improvements, modifications, or enhancements thereto created independently of this Agreement. To the extent that any Work Product incorporates Pre-Existing IP of the Service Provider, the Service Provider grants the Client a perpetual, irrevocable, royalty-free, non-exclusive licence to use such Pre-Existing IP solely as incorporated in and necessary for use of the Work Product.',
  'पूर्व-विद्यमान बौद्धिक संपदा। प्रत्येक पक्ष अपनी पूर्व-विद्यमान बौद्धिक संपदा का स्वामित्व बनाए रखता है। जहाँ कार्य-उत्पाद में सेवा प्रदाता की पूर्व-विद्यमान बौद्धिक संपदा समाहित है, वहाँ सेवा प्रदाता ग्राहक को उसके उपयोग के लिए एक स्थायी, अपरिवर्तनीय, रॉयल्टी-मुक्त गैर-विशेष लाइसेंस प्रदान करता है।',
  'Essential in any IP assignment or development agreement. Protects the service provider''s existing tools and frameworks while ensuring the client gets a workable licence.',
  'Without this carve-out, an IP assignment clause could inadvertently transfer the service provider''s existing tools and IP. The licence-back should be royalty-free and perpetual.',
  'neutral',
  ARRAY['Copyright Act 1957', 'Patents Act 1970'],
  ARRAY['Software Development', 'Technology Agreement', 'MSA'],
  NULL,
  'global'
),

(
  'Open Source Compliance Obligation',
  'IP & Licensing',
  'OPEN SOURCE COMPLIANCE. The Service Provider warrants and represents that: (a) the Work Product does not incorporate any open-source software that is subject to a copyleft or "viral" licence (including without limitation the GNU General Public Licence or GNU Lesser General Public Licence) in a manner that would require the Client''s proprietary code to be disclosed or licensed on open-source terms; and (b) any open-source components incorporated in the Work Product are listed in the Open Source Register to be provided by the Service Provider, and comply with their respective licence terms. The Service Provider shall indemnify the Client against any claims arising from non-compliance with open-source licence obligations.',
  'ओपन सोर्स अनुपालन दायित्व। सेवा प्रदाता आश्वस्त करता है कि कार्य-उत्पाद में कोई ऐसा ओपन-सोर्स सॉफ्टवेयर शामिल नहीं है जो ग्राहक के स्वामित्व कोड के प्रकटीकरण की आवश्यकता करे और सभी ओपन-सोर्स घटकों की सूची प्रदान करेगा।',
  'Critical for software development agreements. Prevents inadvertent "GPL contamination" of client''s proprietary codebase.',
  'Mandate a full bill-of-materials (BOM) or SBOM delivery with each release. The copyleft restriction should not prevent use of permissively-licensed components (MIT, Apache, BSD).',
  'drafter_favours',
  ARRAY['Copyright Act 1957', 'IT Act 2000'],
  ARRAY['Software Development', 'Technology Agreement'],
  NULL,
  'global'
),

(
  'Moral Rights Waiver',
  'IP & Licensing',
  'MORAL RIGHTS WAIVER. To the fullest extent permitted by applicable law, the Service Provider irrevocably waives and agrees not to assert any moral rights (including rights of integrity and attribution) that it may have in the Work Product, and consents to the Client modifying, adapting, translating, distributing, publishing, or otherwise exploiting the Work Product in any manner and for any purpose without any requirement to give credit to or seek further permission from the Service Provider.',
  'नैतिक अधिकारों का त्याग। सेवा प्रदाता कार्य-उत्पाद में अपने सभी नैतिक अधिकारों (अखंडता और श्रेय-अधिकार सहित) का अपरिवर्तनीय रूप से त्याग करता है और ग्राहक को किसी भी प्रकार से और किसी भी उद्देश्य के लिए कार्य-उत्पाद का उपयोग करने की सहमति देता है।',
  'Include in work-for-hire agreements for creative content, software, and marketing materials to prevent the creator from objecting to modifications.',
  'Moral rights are partially inalienable under Section 57 of the Copyright Act 1957 (right against distortion/mutilation). A waiver of distortion rights may not be enforceable; the clause should include consent language as a belt-and-braces approach.',
  'drafter_favours',
  ARRAY['Copyright Act 1957'],
  ARRAY['Content Creation', 'Software Development', 'MSA'],
  'Section 57, Copyright Act 1957',
  'global'
),

-- TERMINATION (5) -----------------------------------------------------------
(
  'Termination for Convenience',
  'Termination',
  'TERMINATION FOR CONVENIENCE. Either party may terminate this Agreement without cause upon [thirty (30)] days'' prior written notice to the other party. Upon termination for convenience by the Client, the Client shall pay the Service Provider for all services satisfactorily performed up to the effective date of termination, plus reasonable demobilisation costs actually incurred by the Service Provider, but shall have no further liability. Upon termination for convenience by the Service Provider, the Service Provider shall not be entitled to any loss-of-profit or anticipated-revenue compensation beyond amounts earned to the termination date.',
  'सुविधानुसार समाप्ति। कोई भी पक्ष [तीस (30)] दिन की पूर्व लिखित सूचना देकर बिना किसी कारण के इस अनुबंध को समाप्त कर सकता है। ग्राहक द्वारा समाप्ति पर, समाप्ति तिथि तक की गई सेवाओं का भुगतान किया जाएगा।',
  'Standard in service agreements and MSAs. Gives either party flexibility to exit without proving breach.',
  'Notice period should be calibrated to the nature of services — longer for complex/integrated services, shorter for commodity services. Ensure wind-down costs are capped.',
  'neutral',
  ARRAY['Indian Contract Act 1872', 'Specific Relief Act 1963'],
  ARRAY['MSA', 'SLA', 'Consulting Agreement', 'Technology Agreement'],
  'Section 73, Indian Contract Act 1872 (consequences of breach)',
  'global'
),

(
  'Termination for Cause with Cure Period',
  'Termination',
  'TERMINATION FOR CAUSE. Either party may terminate this Agreement immediately upon written notice if the other party ("Defaulting Party"): (a) commits a material breach of this Agreement that is incapable of remedy; or (b) commits a material breach of this Agreement that is capable of remedy, and fails to remedy such breach within thirty (30) calendar days of receiving written notice from the non-defaulting party specifying the breach in reasonable detail and requiring it to be remedied; or (c) commits three (3) or more material breaches (whether or not the same in nature) within any consecutive six-month period, even if each individual breach has been remedied.',
  'कारण सहित समाप्ति। यदि कोई पक्ष इस अनुबंध का सारभूत उल्लंघन करे जो सुधारने में असमर्थ हो या तीस दिन की नोटिस के बाद भी सुधार न करे, तो दूसरा पक्ष तत्काल समाप्ति की नोटिस दे सकता है।',
  'Core termination provision for all commercial agreements. The three-strike rule prevents repeated minor breaches from going unpunished.',
  'Always specify what constitutes a "material breach" in a schedule to avoid disputes. The cure period for payment defaults is typically shorter (7-14 days).',
  'neutral',
  ARRAY['Indian Contract Act 1872'],
  ARRAY['MSA', 'SaaS Agreement', 'Vendor Agreement', 'Employment Agreement'],
  'Section 39, Indian Contract Act 1872 (repudiation)',
  'global'
),

(
  'Consequences of Termination and Survival',
  'Termination',
  'CONSEQUENCES OF TERMINATION. Upon termination or expiry of this Agreement for any reason: (a) all licences granted hereunder shall immediately cease; (b) each party shall return or destroy the other party''s Confidential Information in accordance with the Confidentiality clause; (c) the Service Provider shall deliver to the Client all Work Product completed and in progress as at the termination date; and (d) the Client shall pay all undisputed sums due up to the effective termination date. The following provisions shall survive termination: [Confidentiality], [Intellectual Property], [Liability and Indemnity], [Governing Law and Dispute Resolution], and any accrued rights of either party. Termination shall not prejudice any claim that either party may have arising from any antecedent breach.',
  'समाप्ति के परिणाम। अनुबंध समाप्ति पर: सभी लाइसेंस तत्काल समाप्त होंगे; गोपनीय सूचना वापस या नष्ट की जाएगी; कार्य-उत्पाद सौंपा जाएगा; और बकाया देय राशि का भुगतान किया जाएगा। गोपनीयता, बौद्धिक संपदा, दायित्व, और विवाद समाधान खंड जीवित रहेंगे।',
  'Include in every commercial agreement as the "exit" provision. Defines what happens on day zero after termination.',
  'The survival clause must list specific provisions — a generic "all provisions that by nature should survive" is too vague for enforceability.',
  'neutral',
  ARRAY['Indian Contract Act 1872'],
  ARRAY['MSA', 'NDA', 'Technology Agreement', 'SaaS Agreement'],
  NULL,
  'global'
),

(
  'Change of Control Termination Right',
  'Termination',
  'CHANGE OF CONTROL. Either party may terminate this Agreement upon thirty (30) days'' written notice if a Change of Control of the other party occurs. "Change of Control" means: (a) any transaction or series of related transactions by which a third party acquires more than fifty percent (50%) of the voting securities or effective control of a party; (b) any merger, consolidation, or amalgamation after which the shareholders of the party immediately prior to the transaction hold less than fifty percent (50%) of the voting power of the surviving or resulting entity; or (c) the sale of all or substantially all of the assets of a party.',
  'स्वामित्व परिवर्तन समाप्ति अधिकार। यदि किसी पक्ष में स्वामित्व परिवर्तन (किसी तृतीय पक्ष द्वारा 50% से अधिक शेयरों का अधिग्रहण, विलय, या संपत्ति की बिक्री) हो, तो दूसरा पक्ष 30 दिन की सूचना पर अनुबंध समाप्त कर सकता है।',
  'Protect long-term relationships from being involuntarily transferred to a competitor through M&A. Common in strategic partnerships, technology licensing, and outsourcing agreements.',
  'This clause can cause complications in legitimate M&A transactions — consider whether a "cure" right should be given (i.e., the acquirer can remedy by providing equivalent assurances). List carve-outs for intra-group restructurings.',
  'drafter_favours',
  ARRAY['Indian Contract Act 1872', 'Companies Act 2013'],
  ARRAY['MSA', 'Technology Agreement', 'Joint Venture', 'Shareholder Agreement'],
  NULL,
  'global'
),

(
  'Insolvency and Liquidation Termination',
  'Termination',
  'INSOLVENCY TERMINATION. Either party may terminate this Agreement immediately upon written notice if the other party: (a) makes an assignment for the benefit of its creditors or enters into any composition or arrangement with its creditors generally; (b) has a liquidator, receiver, administrator, or similar officer appointed over it or its assets; (c) resolves to go into voluntary liquidation otherwise than for the purpose of a solvent amalgamation or reconstruction; (d) has a winding-up petition presented against it that is not dismissed within thirty (30) days of presentation; or (e) is declared insolvent or bankrupt by a court of competent jurisdiction under the Insolvency and Bankruptcy Code 2016.',
  'दिवालियापन समाप्ति। यदि कोई पक्ष अपने लेनदारों के लाभ हेतु निपटान करे, परिसमापक नियुक्त हो, स्वेच्छिक परिसमापन का संकल्प करे, 30 दिन में खारिज न होने वाली याचिका हो, या IBC 2016 के अंतर्गत दिवालिया घोषित हो, तो दूसरा पक्ष तत्काल समाप्ति नोटिस दे सकता है।',
  'Include in any commercial agreement where counterparty insolvency would make continued performance impossible or undesirable.',
  'IBC moratorium (Section 14) may restrict enforcement after insolvency commencement. Review enforceability with an insolvency specialist if counterparty is distressed. Ipso facto clauses (termination on insolvency) are increasingly scrutinised under IBC.',
  'neutral',
  ARRAY['Insolvency and Bankruptcy Code 2016', 'Indian Contract Act 1872'],
  ARRAY['MSA', 'Vendor Agreement', 'Loan Agreement', 'SaaS Agreement'],
  'Section 14, Insolvency and Bankruptcy Code 2016 (moratorium)',
  'global'
),

-- LIABILITY & INDEMNITY (7) -------------------------------------------------
(
  'Limitation of Liability — Drafter Favours',
  'Liability & Indemnity',
  'LIMITATION OF LIABILITY. Notwithstanding any other provision of this Agreement, neither party''s total aggregate liability to the other party under or in connection with this Agreement (whether arising in contract, tort including negligence, breach of statutory duty, or otherwise) shall exceed an amount equal to the total fees paid or payable by the Client to the Service Provider in the twelve (12) months immediately preceding the event giving rise to the claim. Neither party shall be liable to the other for any indirect, incidental, consequential, special, or punitive loss or damage, or for any loss of profits, loss of revenue, loss of anticipated savings, loss of business, or loss of data, whether or not such losses were foreseeable or the party had been advised of the possibility of such losses.',
  'दायित्व की सीमा। किसी भी पक्ष का कुल दायित्व घटना से पूर्व बारह महीनों में भुगतान की गई/देय फीस से अधिक नहीं होगा। न तो कोई अप्रत्यक्ष, आकस्मिक, या परिणामिक हानि के लिए और न ही लाभ, राजस्व, बचत, व्यापार, या डेटा की हानि के लिए कोई पक्ष उत्तरदायी होगा।',
  'Core commercial protection for service providers. Caps total exposure and excludes economic loss claims.',
  'Courts in India have upheld commercial LOL clauses between sophisticated parties. Ensure carve-outs for fraud, death/personal injury, and IP infringement are listed or they may void the entire cap. The 12-month fee cap may be too low for long-term enterprise contracts — consider a fixed cap.',
  'drafter_favours',
  ARRAY['Indian Contract Act 1872', 'Specific Relief Act 1963'],
  ARRAY['MSA', 'SaaS Agreement', 'Technology Agreement', 'Consulting Agreement'],
  'Section 73-74, Indian Contract Act 1872',
  'global'
),

(
  'Uncapped Liability Carve-Outs',
  'Liability & Indemnity',
  'CARVE-OUTS FROM LIABILITY CAP. Notwithstanding any other limitation of liability in this Agreement, the following liabilities shall not be subject to any cap or exclusion: (a) liability for death or personal injury caused by a party''s negligence; (b) liability for fraud or fraudulent misrepresentation; (c) liability for wilful misconduct or gross negligence; (d) liability for breach of data protection obligations under the Digital Personal Data Protection Act 2023; (e) liability for infringement of a party''s intellectual property rights; and (f) any liability that cannot be limited or excluded by applicable law.',
  'दायित्व सीमा के अपवाद। मृत्यु/व्यक्तिगत चोट, धोखाधड़ी, घोर लापरवाही, DPDP Act 2023 के उल्लंघन, और बौद्धिक संपदा उल्लंघन की देनदारी किसी भी सीमा के अधीन नहीं होगी।',
  'Always pair this with any limitation of liability clause. Without these carve-outs, courts may void the entire limitation clause as unconscionable.',
  'In regulated sectors (banking, insurance, healthcare), sector-specific liability cannot be capped by contract. Always check sector regulations.',
  'neutral',
  ARRAY['Indian Contract Act 1872', 'DPDP Act 2023', 'Consumer Protection Act 2019'],
  ARRAY['MSA', 'SaaS Agreement', 'Technology Agreement'],
  'Section 23, Indian Contract Act 1872 (void agreements)',
  'global'
),

(
  'Mutual Indemnity for Third-Party IP Claims',
  'Liability & Indemnity',
  'IP INFRINGEMENT INDEMNITY. Each party ("Indemnifying Party") shall defend, indemnify, and hold harmless the other party ("Indemnified Party") from and against any third-party claims, proceedings, losses, costs, and expenses (including reasonable legal fees) arising from any allegation that: (a) in the case of the Service Provider — the Work Product or the Service Provider''s Background IP infringes any third party''s intellectual property rights; and (b) in the case of the Client — any materials provided by the Client to the Service Provider for incorporation into the Work Product infringe any third party''s intellectual property rights. The Indemnified Party shall: (i) promptly notify the Indemnifying Party of any claim; (ii) grant the Indemnifying Party sole control of the defence; and (iii) provide reasonable cooperation.',
  'बौद्धिक संपदा उल्लंघन क्षतिपूर्ति। प्रत्येक पक्ष ("क्षतिपूर्तिकर्ता") दूसरे पक्ष ("क्षतिपूर्ति पाने वाले") को उसके कार्य-उत्पाद या प्रदान की गई सामग्री के कारण उत्पन्न तृतीय-पक्ष बौद्धिक संपदा दावों से बचाएगा।',
  'Use in all development and licensing agreements. Mutual — each party indemnifies for what they bring to the table.',
  'The notice and control requirements are essential — indemnifying party must have ability to control the defence. Consider IP insurance if exposure is significant.',
  'neutral',
  ARRAY['Copyright Act 1957', 'Patents Act 1970', 'Trade Marks Act 1999', 'Indian Contract Act 1872'],
  ARRAY['Software Development', 'Technology Agreement', 'Licensing Agreement', 'MSA'],
  NULL,
  'global'
),

(
  'General Third-Party Indemnification',
  'Liability & Indemnity',
  'INDEMNIFICATION. The Service Provider shall indemnify, defend, and hold harmless the Client and its officers, directors, employees, and agents ("Indemnified Parties") from and against any claims, damages, losses, liabilities, costs, and expenses (including reasonable attorneys'' fees) arising out of or relating to: (a) any material breach of this Agreement by the Service Provider; (b) the Service Provider''s negligence or wilful misconduct; (c) any claim by a Service Provider employee or contractor alleging employment, misclassification, or statutory benefit obligations owed by the Client; or (d) any violation of applicable law by the Service Provider.',
  'सामान्य तृतीय-पक्ष क्षतिपूर्ति। सेवा प्रदाता ग्राहक को इस अनुबंध के सारभूत उल्लंघन, लापरवाही, कर्मचारी दावों, और कानून के उल्लंघन से उत्पन्न तृतीय-पक्ष दावों, क्षति, और खर्चों (उचित वकील शुल्क सहित) से बचाएगा।',
  'Asymmetric indemnity that protects the client against service provider failures. Common in IT and outsourcing contracts.',
  'Balance with a reciprocal client indemnity for materials/instructions provided by client. Cap the indemnity obligation at the same level as the LOL cap — otherwise indemnity creates an uncapped backdoor.',
  'drafter_favours',
  ARRAY['Indian Contract Act 1872'],
  ARRAY['MSA', 'Outsourcing Agreement', 'Consulting Agreement'],
  NULL,
  'global'
),

(
  'Consequential Damages Exclusion',
  'Liability & Indemnity',
  'CONSEQUENTIAL LOSS EXCLUSION. In no event shall either party be liable to the other for any loss of profits, loss of revenue, loss of anticipated savings, loss of business opportunity, loss of goodwill, loss of data, or any indirect, incidental, special, or consequential loss or damage, in each case howsoever arising, whether under contract, in tort (including negligence or breach of statutory duty), by way of indemnity, or otherwise, even if such party has been advised of the possibility of such loss.',
  'परिणामी हानि अपवर्जन। किसी भी पक्ष की लाभ की हानि, राजस्व की हानि, प्रत्याशित बचत की हानि, व्यावसायिक अवसर की हानि, सद्भावना की हानि, डेटा की हानि, या किसी अप्रत्यक्ष, आकस्मिक, विशेष, या परिणामिक हानि के लिए कोई दायित्व नहीं होगा।',
  'Core commercial protection against "consequential" economic loss claims, which can be far larger than direct damages.',
  'Some jurisdictions treat this type of exclusion more narrowly when the consequential loss was the main commercial purpose of the contract. Always check with the LOL cap and carve-outs.',
  'drafter_favours',
  ARRAY['Indian Contract Act 1872'],
  ARRAY['MSA', 'SaaS Agreement', 'Technology Agreement', 'Vendor Agreement'],
  'Section 73, Indian Contract Act 1872 (remoteness of damage)',
  'global'
),

(
  'Service Provider Indemnity Cap and Insurance',
  'Liability & Indemnity',
  'INSURANCE AND INDEMNITY CAP. The Service Provider shall maintain, throughout the term of this Agreement and for two (2) years thereafter, the following insurance coverages with reputable insurers: (a) professional indemnity (errors and omissions) insurance with a minimum coverage of INR [amount] per claim and per annum; (b) commercial general liability insurance with minimum coverage of INR [amount] per occurrence; and (c) cyber liability insurance with minimum coverage of INR [amount] per incident. The aggregate liability of the Service Provider under any indemnity in this Agreement shall not exceed the limits of the applicable insurance coverage, except for fraud, wilful misconduct, or obligations under the DPDP Act 2023.',
  'बीमा और क्षतिपूर्ति सीमा। सेवा प्रदाता पूरे अनुबंध अवधि और उसके बाद दो वर्षों तक व्यावसायिक क्षतिपूर्ति, वाणिज्यिक सामान्य देनदारी, और साइबर देनदारी बीमा बनाए रखेगा।',
  'Use in IT, professional services, and data processing agreements where counterparty risk management requires insurance evidence.',
  'Fill in the coverage amounts based on contract value and risk profile. Require annual certificates of insurance. Consider adding D&O insurance for senior executive involvement.',
  'drafter_favours',
  ARRAY['Insurance Act 1938', 'Indian Contract Act 1872', 'DPDP Act 2023'],
  ARRAY['MSA', 'Technology Agreement', 'Outsourcing Agreement'],
  NULL,
  'global'
),

(
  'Indemnity Procedure — Notice and Control',
  'Liability & Indemnity',
  'INDEMNIFICATION PROCEDURE. As a condition to the indemnifying party''s obligations under this Agreement: (a) the indemnified party shall promptly notify the indemnifying party in writing of any claim for which indemnification is sought, provided that failure to give prompt notice shall not relieve the indemnifying party of its obligations except to the extent it is materially prejudiced by such failure; (b) the indemnifying party shall have the right to assume sole control of the defence and settlement of the claim using counsel of its choosing; (c) the indemnified party shall provide reasonable assistance, information, and co-operation to the indemnifying party at the indemnifying party''s expense; and (d) the indemnifying party shall not settle any claim in a manner that imposes any obligation, restriction, or liability on the indemnified party without its prior written consent, which shall not be unreasonably withheld.',
  'क्षतिपूर्ति प्रक्रिया। क्षतिपूर्ति के अधिकार के लिए: क्षतिपूर्ति पाने वाला तत्काल लिखित सूचना देगा; क्षतिपूर्तिकर्ता बचाव का एकमात्र नियंत्रण लेगा; क्षतिपूर्ति पाने वाला उचित सहयोग करेगा; और क्षतिपूर्तिकर्ता बिना सहमति के कोई समझौता नहीं करेगा।',
  'Essential procedural clause that must accompany any substantive indemnity. Without it, the indemnity is unenforceable in practice.',
  'The "material prejudice" qualifier for late notice is important — courts will not penalise minor delays. The consent to settlement clause protects against the indemnifying party settling in a way that creates precedent harmful to the indemnified party.',
  'neutral',
  ARRAY['Indian Contract Act 1872', 'Code of Civil Procedure 1908'],
  ARRAY['MSA', 'Technology Agreement', 'Licensing Agreement', 'NDA'],
  NULL,
  'global'
),

-- DISPUTE RESOLUTION (5) ----------------------------------------------------
(
  'Tiered Dispute Resolution — Negotiation, Mediation, Arbitration',
  'Dispute Resolution',
  'DISPUTE RESOLUTION. (a) Negotiation. If a dispute arises between the parties in connection with this Agreement ("Dispute"), either party may serve written notice on the other ("Dispute Notice") requiring senior management representatives of both parties to meet within fifteen (15) Business Days and attempt to resolve the Dispute in good faith. (b) Mediation. If the Dispute is not resolved within thirty (30) days of the Dispute Notice, either party may refer the Dispute to mediation under the Mediation Rules of the Indian Council of Arbitration ("ICA"). (c) Arbitration. If the Dispute is not resolved within thirty (30) days of the mediation referral (or if a party refuses to participate in mediation), the Dispute shall be finally resolved by arbitration administered by the ICA under its Arbitration Rules, by a sole arbitrator appointed by mutual agreement (or, failing agreement, by the ICA). The seat and venue of arbitration shall be [New Delhi / Mumbai]. The language of arbitration shall be English. The award shall be final and binding.',
  'चरणबद्ध विवाद समाधान। (क) वार्ता: विवाद उत्पन्न होने पर वरिष्ठ प्रतिनिधि 15 कार्य-दिवसों में मिलेंगे। (ख) मध्यस्थता: 30 दिन में न सुलझने पर ICA मध्यस्थता नियमों के तहत मध्यस्थता। (ग) मध्यस्थम: 30 दिन में न सुलझने पर ICA नियमों के तहत अंतिम और बाध्यकारी मध्यस्थम।',
  'Best practice for commercial agreements. Promotes settlement before costly arbitration. Suitable for domestic B2B contracts.',
  'For international agreements, consider ICC or SIAC rather than ICA. Ensure the arbitration seat is specified — it determines applicable procedural law and courts with supervisory jurisdiction.',
  'neutral',
  ARRAY['Arbitration and Conciliation Act 1996', 'Mediation Act 2023', 'Indian Contract Act 1872'],
  ARRAY['MSA', 'Technology Agreement', 'Joint Venture', 'Vendor Agreement'],
  'Arbitration and Conciliation Act 1996 (as amended 2019); Mediation Act 2023',
  'global'
),

(
  'Sole Arbitrator — DIAC Delhi',
  'Dispute Resolution',
  'ARBITRATION. Any dispute, controversy, or claim arising out of or relating to this Agreement, or the breach, termination, or validity thereof, shall be finally settled by arbitration in accordance with the Delhi International Arbitration Centre (DIAC) Arbitration Rules. The arbitral tribunal shall consist of a sole arbitrator appointed by the DIAC. The seat and legal place of arbitration shall be New Delhi, India. The language of the arbitral proceedings shall be English. The award rendered by the arbitral tribunal shall be final and binding upon the parties and may be entered and enforced in any court having jurisdiction. Pending resolution of any dispute, the parties shall continue to perform their respective obligations under this Agreement.',
  'एकल मध्यस्थ — DIAC दिल्ली। इस अनुबंध से उत्पन्न कोई भी विवाद DIAC मध्यस्थम नियमों के अनुसार नई दिल्ली में एकल मध्यस्थ द्वारा अंतिम रूप से निपटाया जाएगा। पुरस्कार अंतिम और बाध्यकारी होगा।',
  'Efficient and cost-effective for mid-value domestic disputes. DIAC is the leading institutional arbitration centre in Delhi.',
  'For disputes above INR 50 crore, consider a three-member tribunal. Ensure both parties agree on emergency arbitrator provisions in the DIAC rules.',
  'neutral',
  ARRAY['Arbitration and Conciliation Act 1996'],
  ARRAY['MSA', 'Technology Agreement', 'Commercial Contract'],
  'Arbitration and Conciliation Act 1996, Section 7 (arbitration agreement)',
  'global'
),

(
  'Exclusive Court Jurisdiction — High Court',
  'Dispute Resolution',
  'JURISDICTION. Subject to any arbitration agreement in this Agreement, the parties irrevocably submit to the exclusive jurisdiction of the courts of [Mumbai / New Delhi / Bengaluru] in respect of any proceedings arising out of or in connection with this Agreement. Each party irrevocably waives any objection to proceedings in such courts on the grounds of inconvenient forum or any similar grounds.',
  'अनन्य न्यायालय क्षेत्राधिकार। इस अनुबंध से उत्पन्न किसी भी कार्यवाही के संबंध में दोनों पक्ष [मुंबई / नई दिल्ली / बेंगलुरु] के न्यायालयों के अनन्य क्षेत्राधिकार के लिए अपरिवर्तनीय रूप से सहमत हैं।',
  'Use for injunctive relief or specific performance alongside an arbitration clause, or as standalone jurisdiction in simpler agreements.',
  'Multiple courts may claim jurisdiction for company law matters (NCLT) or consumer matters (NCDRC). This clause covers contractual disputes only.',
  'neutral',
  ARRAY['Code of Civil Procedure 1908', 'Indian Contract Act 1872'],
  ARRAY['MSA', 'Commercial Contract', 'NDA'],
  'Section 20, Code of Civil Procedure 1908 (venue)',
  'global'
),

(
  'Emergency Relief — Injunctive Relief Carve-Out',
  'Dispute Resolution',
  'EMERGENCY RELIEF. Notwithstanding any arbitration agreement, either party may apply to any court of competent jurisdiction for interim or injunctive relief, including specific performance and injunctions to prevent irreparable harm, without first complying with any dispute resolution procedure in this Agreement and without waiving its right to refer the underlying dispute to arbitration. Neither party shall be precluded from seeking any interim relief from the arbitral tribunal once constituted.',
  'आपातकालीन राहत। किसी भी मध्यस्थम समझौते के बावजूद, कोई भी पक्ष अपूरणीय क्षति को रोकने के लिए किसी भी सक्षम न्यायालय से अंतरिम या निषेधाज्ञा राहत के लिए आवेदन कर सकता है।',
  'Critical in IP, confidentiality, and non-compete matters where delay in obtaining relief causes irreparable harm.',
  'The carve-out is for emergency relief only — the substantive dispute must still go to arbitration. Courts have generally respected this structure under Section 9 of the Arbitration Act.',
  'neutral',
  ARRAY['Arbitration and Conciliation Act 1996', 'Specific Relief Act 1963'],
  ARRAY['NDA', 'IP Licensing', 'Employment Agreement', 'Technology Agreement'],
  'Section 9, Arbitration and Conciliation Act 1996 (interim measures)',
  'global'
),

(
  'Expert Determination for Technical Disputes',
  'Dispute Resolution',
  'EXPERT DETERMINATION. Any dispute concerning a technical matter (including disputes about the quality, performance, or conformity of deliverables with their specifications) shall, at the election of either party, be referred to an independent expert (the "Expert") for determination. The Expert shall be appointed by agreement of the parties within ten (10) Business Days of the dispute referral, or failing agreement, by the President of the [Institute of Electrical and Electronics Engineers / Institute of Chartered Accountants of India]. The Expert shall act as an expert and not as an arbitrator. The Expert''s determination shall be final and binding except in the case of manifest error or fraud.',
  'तकनीकी विवादों के लिए विशेषज्ञ निर्धारण। गुणवत्ता, प्रदर्शन, या विनिर्देशों के अनुरूपता से संबंधित विवादों को किसी भी पक्ष के चुनाव पर एक स्वतंत्र विशेषज्ञ को संदर्भित किया जाएगा। विशेषज्ञ का निर्णय स्पष्ट त्रुटि या धोखाधड़ी को छोड़कर अंतिम और बाध्यकारी होगा।',
  'Use in SaaS, technology, and construction contracts where disputes about technical specifications need specialist resolution faster than arbitration.',
  'Expert determination is faster and cheaper than arbitration for technical matters. Ensure the right appointing body is selected for the subject matter.',
  'neutral',
  ARRAY['Indian Contract Act 1872', 'Arbitration and Conciliation Act 1996'],
  ARRAY['SaaS Agreement', 'Technology Agreement', 'Construction Contract'],
  NULL,
  'global'
),

-- FORCE MAJEURE (3) ---------------------------------------------------------
(
  'Standard Force Majeure Clause',
  'Force Majeure',
  'FORCE MAJEURE. Neither party shall be in breach of this Agreement or otherwise liable for any failure or delay in the performance of its obligations if such failure or delay results from a Force Majeure Event. "Force Majeure Event" means any event outside the reasonable control of a party, including acts of God, natural disaster, earthquake, flood, storm, fire, epidemic or pandemic, war, terrorism, riot, civil commotion, acts of government or governmental authority, blockades, embargo, or industrial action. The affected party shall: (a) promptly notify the other party in writing upon becoming aware of the Force Majeure Event and its expected duration; (b) use all reasonable efforts to overcome or mitigate the effects of the Force Majeure Event; and (c) resume performance as soon as reasonably practicable. If a Force Majeure Event continues for more than sixty (60) days, either party may terminate this Agreement on thirty (30) days'' written notice without liability.',
  'फोर्स मेजर। यदि किसी पक्ष का दायित्व-निर्वहन असाधारण परिस्थितियों (ईश्वरीय कृत्य, प्राकृतिक आपदा, महामारी, युद्ध, आतंकवाद, सरकारी कार्रवाई) के कारण विलंबित या असफल हो, तो वह उल्लंघन के लिए उत्तरदायी नहीं होगा। प्रभावित पक्ष तत्काल सूचना देगा, न्यूनीकरण का प्रयास करेगा, और यथाशीघ्र पुनः प्रारंभ करेगा। 60 दिन से अधिक जारी रहने पर 30 दिन की नोटिस पर समाप्ति का अधिकार होगा।',
  'Standard protection for both parties against external events beyond their control.',
  'Ensure "epidemic or pandemic" is expressly listed post-COVID. Financial hardship alone (e.g. cost escalation, market downturn) is NOT a force majeure event. Supply chain disruption should be addressed separately.',
  'neutral',
  ARRAY['Indian Contract Act 1872'],
  ARRAY['MSA', 'Vendor Agreement', 'Construction Contract', 'Technology Agreement'],
  'Section 56, Indian Contract Act 1872 (frustration of contract)',
  'global'
),

(
  'Force Majeure — COVID/Pandemic Specific',
  'Force Majeure',
  'PANDEMIC FORCE MAJEURE. For the avoidance of doubt, the occurrence of any epidemic, pandemic, or public health emergency declared by a competent governmental authority, including any related lockdown, quarantine, travel restriction, or governmental directive restricting movement of persons or goods, shall constitute a Force Majeure Event for the purposes of this Agreement, regardless of whether such epidemic, pandemic, or public health emergency was foreseeable at the date of this Agreement. The affected party shall provide written notice specifying: (a) the nature and extent of the pandemic-related disruption; (b) the specific obligations affected; (c) the estimated duration of the disruption; and (d) the mitigation measures being taken.',
  'महामारी-विशिष्ट फोर्स मेजर। किसी भी सक्षम सरकारी प्राधिकरण द्वारा घोषित महामारी, लॉकडाउन, क्वारंटाइन, या यात्रा प्रतिबंध को फोर्स मेजर की घटना माना जाएगा, चाहे वह अनुबंध तिथि पर पूर्वानुमानित हो या न हो।',
  'Include in agreements where COVID-related disruption is a known risk factor or in sectors heavily affected by pandemic restrictions (hospitality, events, logistics).',
  'Consider adding a "no-excuse" carve-out for payment obligations — payment should not be excused by force majeure except in extreme cases.',
  'neutral',
  ARRAY['Indian Contract Act 1872', 'Epidemic Diseases Act 1897', 'NDMA Act 2005'],
  ARRAY['Vendor Agreement', 'Events Contract', 'Hospitality Agreement', 'Supply Agreement'],
  'Section 56, Indian Contract Act 1872; NDMA Act 2005',
  'global'
),

(
  'Force Majeure — Notice and Mitigation Obligations',
  'Force Majeure',
  'FORCE MAJEURE — NOTICE AND MITIGATION. The party claiming Force Majeure ("Claiming Party") shall: (a) give written notice to the other party within forty-eight (48) hours of the Force Majeure Event (or within forty-eight hours of becoming aware of it if it occurs without warning); (b) provide a reasonably detailed description of the Force Majeure Event, the obligations affected, and the estimated duration; (c) provide weekly written updates on the status of the Force Majeure Event and the steps being taken to overcome it; (d) use commercially reasonable efforts to find alternative means to perform or cause performance of affected obligations; and (e) promptly notify the other party when the Force Majeure Event ceases and resume performance no later than seven (7) days thereafter. Failure to comply with these notification requirements shall preclude the Claiming Party from relying on this Force Majeure clause.',
  'फोर्स मेजर — सूचना और न्यूनीकरण दायित्व। दावाकर्ता पक्ष 48 घंटे के भीतर लिखित सूचना, साप्ताहिक अपडेट, वैकल्पिक साधनों की खोज, और घटना समाप्ति पर 7 दिन के भीतर पुनः प्रारंभ का दायित्व वहन करेगा। इन आवश्यकताओं का पालन न करने पर फोर्स मेजर का दावा नहीं किया जा सकेगा।',
  'Use alongside any standard force majeure clause to create enforceable obligations that prevent the clause from becoming an open-ended escape hatch.',
  'The 48-hour notice requirement is strict — consider 72 hours for remote or complex operations. The "commercially reasonable efforts" standard for mitigation should align with the rest of the agreement.',
  'drafter_favours',
  ARRAY['Indian Contract Act 1872'],
  ARRAY['MSA', 'Vendor Agreement', 'Construction Contract'],
  NULL,
  'global'
),

-- DATA PROTECTION / DPDP (7) ------------------------------------------------
(
  'Data Processing Agreement — DPDP Act 2023 Compliant',
  'Data Protection / DPDP',
  'DATA PROCESSING AGREEMENT. To the extent the Service Provider processes Personal Data on behalf of the Client as a Data Processor (as those terms are defined under the Digital Personal Data Protection Act 2023 ("DPDP Act")), the Service Provider agrees to: (a) process Personal Data only on documented instructions from the Client; (b) implement appropriate technical and organisational measures to ensure a level of security appropriate to the risk; (c) not engage sub-processors without the prior written consent of the Client; (d) assist the Client in fulfilling its obligations to respond to Data Principal rights requests within the timelines prescribed under the DPDP Act; (e) notify the Client of any Personal Data Breach within twenty-four (24) hours of discovery; (f) upon termination, delete or return all Personal Data and certify such deletion in writing; and (g) make available all information necessary to demonstrate compliance with this clause and allow for audits.',
  'डेटा प्रसंस्करण समझौता — DPDP अधिनियम 2023 अनुरूप। सेवा प्रदाता डेटा प्रोसेसर के रूप में: केवल ग्राहक के निर्देशों पर प्रसंस्करण करेगा; उचित सुरक्षा उपाय लागू करेगा; उप-प्रोसेसर के लिए पूर्व सहमति लेगा; डेटा प्रमुख अधिकार अनुरोधों में सहायता करेगा; 24 घंटे के भीतर उल्लंघन की सूचना देगा; और समाप्ति पर सभी व्यक्तिगत डेटा नष्ट करेगा।',
  'Mandatory for all B2B contracts where a service provider processes personal data on behalf of the client. Required under Section 8(2) DPDP Act 2023.',
  'The DPDP Act 2023 is still awaiting full implementation rules. Monitor DPDP Rules when published. Sub-processor obligations must flow down.',
  'drafter_favours',
  ARRAY['DPDP Act 2023', 'IT Act 2000', 'IT (Reasonable Security Practices) Rules 2011'],
  ARRAY['Technology Agreement', 'SaaS Agreement', 'Outsourcing Agreement', 'MSA'],
  'Section 8(2), Digital Personal Data Protection Act 2023',
  'global'
),

(
  'Consent and Withdrawal Clause — DPDP Act',
  'Data Protection / DPDP',
  'CONSENT. The Data Fiduciary shall obtain the free, specific, informed, and unambiguous consent of each Data Principal before processing their Personal Data for any purpose. Consent shall be: (a) presented in plain and simple language in English and in at least one Indian language specified by the Data Principal; (b) obtained separately from any other matter and not bundled with terms and conditions; and (c) accompanied by a clear notice specifying the purpose of processing, the identity of the Data Fiduciary, and the Data Principal''s right to withdraw consent. The Data Fiduciary shall provide a mechanism by which Data Principals may withdraw consent at any time with the same ease as giving consent, and shall cease processing within a reasonable period of such withdrawal.',
  'सहमति और वापसी खंड। डेटा न्यासी प्रत्येक डेटा प्रमुख की स्वतंत्र, विशिष्ट, सूचित और अस्पष्ट सहमति प्राप्त करेगा। सहमति सरल भाषा में, प्रयोजन-विशिष्ट, और नियमों-शर्तों से अलग होगी। डेटा प्रमुख सहमति उतनी ही आसानी से वापस ले सकेगा।',
  'Use in privacy notices, consent forms, and contracts where consent is the lawful basis for processing personal data. Directly implements DPDP Act Section 6.',
  'Consent is just one of several grounds for processing under the DPDP Act. Evaluate whether legitimate uses (legal obligation, state functions) are a more appropriate basis.',
  'neutral',
  ARRAY['DPDP Act 2023'],
  ARRAY['Technology Agreement', 'App Terms', 'Consumer Contract', 'SaaS Agreement'],
  'Section 6, Digital Personal Data Protection Act 2023',
  'global'
),

(
  'Data Principal Rights — Access, Correction, Erasure',
  'Data Protection / DPDP',
  'DATA PRINCIPAL RIGHTS. The Data Fiduciary shall establish and maintain a mechanism for Data Principals to exercise their rights under the Digital Personal Data Protection Act 2023, including: (a) the right to obtain a summary of the personal data being processed and the processing activities (Section 11); (b) the right to correct, update, and complete inaccurate or incomplete personal data within thirty (30) days of the request (Section 12); (c) the right to erasure of personal data when the purpose of processing is fulfilled or when consent is withdrawn (Section 12); (d) the right to nominate any individual to exercise rights on the Data Principal''s behalf in the event of death or incapacity (Section 13); and (e) the right to seek redressal of grievances from the Data Fiduciary within thirty (30) days.',
  'डेटा प्रमुख अधिकार। डेटा न्यासी DPDP अधिनियम 2023 के अंतर्गत डेटा प्रमुखों के अधिकारों के लिए तंत्र स्थापित करेगा: डेटा सारांश, 30 दिन में सुधार/मिटाने, नामांकन, और 30 दिन में शिकायत निवारण।',
  'Required in all privacy policies and contracts where the organisation is a Data Fiduciary processing personal data.',
  'The DPDP Rules will specify the technical format for rights requests. Build in a ticket/reference number system for tracking. SLA should be 30 days maximum.',
  'neutral',
  ARRAY['DPDP Act 2023'],
  ARRAY['Technology Agreement', 'App Terms', 'Consumer Contract', 'SaaS Agreement'],
  'Sections 11-13, Digital Personal Data Protection Act 2023',
  'global'
),

(
  'Breach Notification — 72-Hour DPB Notification',
  'Data Protection / DPDP',
  'PERSONAL DATA BREACH NOTIFICATION. In the event of a Personal Data Breach, the Data Fiduciary shall: (a) notify the Data Protection Board of India within seventy-two (72) hours of becoming aware of the breach, in the prescribed format; (b) notify each affected Data Principal of the breach in plain and simple language, in English and any Indian language specified by the Data Principal, including: the nature of the breach, the categories and approximate number of Data Principals affected, the likely consequences of the breach, and the measures taken or proposed to address the breach; (c) maintain a Breach Register recording all breaches (whether or not notifiable) for a minimum of three (3) years from the date of the breach; and (d) assess the impact of the breach and document the assessment within forty-eight (48) hours of discovery.',
  'व्यक्तिगत डेटा उल्लंघन अधिसूचना। डेटा न्यासी उल्लंघन की जानकारी होने के 72 घंटे के भीतर DPB को सूचित करेगा, प्रभावित डेटा प्रमुखों को उचित भाषा में जानकारी देगा, 3 वर्षों के लिए उल्लंघन रजिस्टर बनाए रखेगा, और 48 घंटे में प्रभाव मूल्यांकन दस्तावेज करेगा।',
  'Mandatory for all Data Fiduciaries under DPDP Act 2023. Include in DPAs, privacy programmes, and outsourcing agreements.',
  'The 72-hour timeline runs from when the organisation becomes aware, not from when the breach actually occurred. Ensure breach detection controls (SIEM, alerting) are in place.',
  'neutral',
  ARRAY['DPDP Act 2023'],
  ARRAY['Technology Agreement', 'SaaS Agreement', 'Outsourcing Agreement', 'MSA'],
  'Section 40, Digital Personal Data Protection Act 2023',
  'global'
),

(
  'Data Retention and Deletion',
  'Data Protection / DPDP',
  'DATA RETENTION AND DELETION. The Data Fiduciary shall: (a) retain Personal Data only for as long as necessary to fulfil the purpose for which it was collected, or as required by applicable law or regulatory authority; (b) implement a documented Data Retention Policy specifying retention periods per category of Personal Data; (c) automatically delete or anonymise Personal Data upon expiry of the applicable retention period; (d) notify Data Principals of the applicable retention period in the privacy notice at the time of collection; and (e) ensure that deletion obligations apply equally to backup, archived, and test copies of Personal Data.',
  'डेटा प्रतिधारण और विलोपन। डेटा न्यासी व्यक्तिगत डेटा केवल प्रयोजन पूर्ति तक रखेगा; प्रत्येक श्रेणी के लिए प्रतिधारण अवधि दस्तावेज करेगा; अवधि समाप्त होने पर स्वचालित रूप से हटाएगा या अज्ञात करेगा; और बैकअप प्रतियों पर भी दायित्व लागू करेगा।',
  'Required under DPDP Act 2023 Section 8(7). Critical for SaaS, health tech, fintech, and HR platforms.',
  'Regulatory minimum retention requirements may override the deletion obligation (e.g. RBI/SEBI record-keeping mandates). Document all regulatory exceptions in the retention policy.',
  'neutral',
  ARRAY['DPDP Act 2023', 'IT Act 2000'],
  ARRAY['Technology Agreement', 'SaaS Agreement', 'HR Agreement', 'Healthcare Contract'],
  'Section 8(7), Digital Personal Data Protection Act 2023',
  'global'
),

(
  'Cross-Border Personal Data Transfer',
  'Data Protection / DPDP',
  'CROSS-BORDER DATA TRANSFERS. The Data Fiduciary shall not transfer Personal Data to any country or territory outside India except to countries or territories notified by the Central Government as permitting such transfer ("Permitted Countries"). The Data Fiduciary shall: (a) maintain a register of all cross-border transfers identifying the receiving country, the categories of data transferred, and the legal basis; (b) incorporate standard contractual clauses approved by the Data Protection Board in all agreements with overseas recipients of Personal Data; (c) notify Data Principals of any cross-border transfers in the privacy notice; and (d) ensure that overseas recipients are bound by obligations equivalent to those applicable to the Data Fiduciary under the DPDP Act.',
  'सीमा-पार व्यक्तिगत डेटा हस्तांतरण। डेटा न्यासी केंद्र सरकार द्वारा अधिसूचित देशों को ही व्यक्तिगत डेटा हस्तांतरित करेगा; हस्तांतरण रजिस्टर बनाए रखेगा; मानक संविदात्मक खंड शामिल करेगा; और प्राप्तकर्ताओं पर समतुल्य दायित्व सुनिश्चित करेगा।',
  'Required for any cloud service, SaaS, or offshore processing where data leaves India. Critical for MNCs with global data flows.',
  'The DPDP Rules will list Permitted Countries. Until rules are published, use existing frameworks (data residency for sensitive categories). Monitor MeitY guidance.',
  'neutral',
  ARRAY['DPDP Act 2023', 'IT Act 2000'],
  ARRAY['Technology Agreement', 'SaaS Agreement', 'Cloud Agreement', 'MSA'],
  'Section 16, Digital Personal Data Protection Act 2023',
  'global'
),

(
  'Sub-Processor Restrictions and Flow-Down',
  'Data Protection / DPDP',
  'SUB-PROCESSORS. The Data Processor shall not engage any sub-processor to carry out processing of Personal Data on behalf of the Data Fiduciary without the prior written consent of the Data Fiduciary, such consent not to be unreasonably withheld. Where the Data Fiduciary consents to the engagement of a sub-processor: (a) the Data Processor shall impose on each sub-processor data protection obligations that are no less onerous than those imposed on the Data Processor under this Agreement; (b) the Data Processor shall remain fully liable to the Data Fiduciary for the performance of the sub-processor''s obligations; and (c) the Data Processor shall provide the Data Fiduciary with an up-to-date list of all sub-processors engaged and shall notify the Data Fiduciary at least thirty (30) days before engaging any new sub-processor.',
  'उप-प्रोसेसर प्रतिबंध। डेटा प्रोसेसर डेटा न्यासी की पूर्व लिखित सहमति के बिना कोई उप-प्रोसेसर नियुक्त नहीं करेगा। सहमति दी जाने पर, प्रोसेसर उप-प्रोसेसर पर समतुल्य दायित्व लगाएगा, उनके प्रदर्शन के लिए जिम्मेदार रहेगा, और नए उप-प्रोसेसर नियुक्ति से 30 दिन पूर्व सूचित करेगा।',
  'Include in all DPAs with cloud providers, BPOs, and IT service providers. Ensures downstream data protection obligations.',
  'The Data Fiduciary should maintain a current list of approved sub-processors. Consider providing blanket pre-approval for cloud infrastructure sub-processors with notification obligations.',
  'drafter_favours',
  ARRAY['DPDP Act 2023', 'IT Act 2000'],
  ARRAY['Technology Agreement', 'SaaS Agreement', 'BPO Agreement', 'MSA'],
  'Section 8(2), Digital Personal Data Protection Act 2023',
  'global'
),

-- GST & TAX (5) -------------------------------------------------------------
(
  'GST and Place of Supply Clause',
  'GST & Tax',
  'GST AND PLACE OF SUPPLY. (a) All amounts payable under this Agreement are exclusive of Goods and Services Tax ("GST"). GST shall be charged additionally at the rate applicable under the CGST Act 2017 and IGST Act 2017, as notified by the Central Government from time to time. (b) The Place of Supply for services under this Agreement shall be [state], being the location of the recipient of services under Section 12/13 of the IGST Act 2017. Accordingly, [CGST and SGST / IGST] at the rate of [___]% shall apply. (c) Each party shall provide the other with its valid GSTIN prior to the first invoice being raised. If the correct GSTIN is not provided, the party not providing the GSTIN shall bear the resulting GST cost. (d) Each party shall ensure timely filing of their respective GST returns to enable the other party to claim Input Tax Credit.',
  'GST और आपूर्ति स्थान खंड। (क) सभी देय राशियाँ GST-अनन्य हैं। (ख) सेवाओं के लिए आपूर्ति स्थान [राज्य] है। (ग) प्रत्येक पक्ष पहले चालान से पूर्व अपना वैध GSTIN प्रदान करेगा। (घ) प्रत्येक पक्ष समय पर GST रिटर्न दाखिल करेगा।',
  'Include in all commercial service agreements to ensure correct GST treatment and protect Input Tax Credit.',
  'The applicable GST rate (5%, 12%, 18%, 28%) must be inserted based on the HSN/SAC classification of the goods/services. Rate errors can trigger demand notices.',
  'neutral',
  ARRAY['CGST Act 2017', 'IGST Act 2017', 'SGST Acts'],
  ARRAY['MSA', 'Technology Agreement', 'Consulting Agreement', 'Vendor Agreement'],
  'Sections 12-13, IGST Act 2017; Section 15, CGST Act 2017',
  'global'
),

(
  'Reverse Charge Mechanism (RCM) Clause',
  'GST & Tax',
  'REVERSE CHARGE MECHANISM. The parties acknowledge that certain supplies under this Agreement may be subject to reverse charge under Section 9(3) or Section 9(4) of the CGST Act 2017 or the corresponding provisions of the applicable IGST Act / SGST Acts ("Reverse Charge"). Where Reverse Charge applies: (a) the recipient of the supply shall be liable to pay GST directly to the government; (b) the supplier shall issue an invoice without charging GST and shall indicate "Reverse Charge Applicable" on the invoice; (c) the recipient shall self-invoice and comply with all applicable GST return filing requirements in respect of such supplies; and (d) the consideration payable to the supplier shall be reduced to reflect that the recipient bears the GST liability.',
  'रिवर्स चार्ज तंत्र (RCM)। जहाँ इस अनुबंध के अंतर्गत आपूर्ति पर RCM लागू होता है: आपूर्ति का प्राप्तकर्ता सीधे सरकार को GST का भुगतान करेगा; आपूर्तिकर्ता "रिवर्स चार्ज लागू" अंकित बिना-GST चालान जारी करेगा; और प्राप्तकर्ता स्व-चालान जारी करेगा।',
  'Required for legal services received by companies, GTA services, services from unregistered vendors, and import of services. Frequently overlooked in contracts.',
  'RCM applies to specific notified categories — check Notification No. 13/2017-CT(Rate). RCM also applies to B2B supplies from unregistered persons under Section 9(4).',
  'neutral',
  ARRAY['CGST Act 2017', 'IGST Act 2017'],
  ARRAY['Legal Services Agreement', 'Transportation Contract', 'Vendor Agreement', 'Import of Services'],
  'Section 9(3)-(4), CGST Act 2017; Notification No. 13/2017-CT(Rate)',
  'global'
),

(
  'Input Tax Credit Allocation and Compliance',
  'GST & Tax',
  'INPUT TAX CREDIT. (a) The Service Provider shall ensure timely filing of GSTR-1 to enable the Client to avail Input Tax Credit ("ITC") on the supplies made under this Agreement. (b) If the Client is unable to avail or is required to reverse ITC due to any default or non-compliance by the Service Provider (including but not limited to non-filing of GSTR-1, mismatch between GSTR-1 and GSTR-3B, or cancellation of GST registration), the Service Provider shall indemnify the Client for the amount of ITC lost, together with any applicable interest and penalties. (c) The obligation under (b) shall survive termination of this Agreement. (d) If payment is not made to the Service Provider within one hundred and eighty (180) days of the invoice date, the Client shall reverse the ITC claimed on such invoice in accordance with Rule 37 of the CGST Rules.',
  'इनपुट टैक्स क्रेडिट। सेवा प्रदाता समय पर GSTR-1 दाखिल करेगा; सेवा प्रदाता की चूक से ITC हानि होने पर ब्याज और जुर्माने सहित क्षतिपूर्ति देगा; और 180 दिन में भुगतान न होने पर ग्राहक ITC वापस करेगा।',
  'Critical ITC protection clause for buyers/recipients. The indemnity for ITC denial is increasingly important as GST enforcement tightens.',
  'The 180-day reversal rule is a hard legal requirement under Rule 37 CGST Rules. Structure payment terms to avoid crossing this threshold.',
  'drafter_favours',
  ARRAY['CGST Act 2017', 'CGST Rules 2017'],
  ARRAY['MSA', 'Technology Agreement', 'Vendor Agreement', 'Consulting Agreement'],
  'Section 16(2), CGST Act 2017; Rule 37, CGST Rules 2017',
  'global'
),

(
  'E-Invoice and IRN Compliance',
  'GST & Tax',
  'E-INVOICE COMPLIANCE. The Service Provider represents and warrants that, where required under Rule 48(4) of the CGST Rules 2017, it shall: (a) generate all invoices issued under this Agreement through the Invoice Registration Portal ("IRP") of the Goods and Services Tax Network ("GSTN"); (b) ensure each invoice carries a valid Invoice Reference Number ("IRN") and QR code as prescribed; (c) not present any invoice that does not comply with the e-invoicing requirements as a valid document for payment; and (d) maintain records of all e-invoices and IRNs for the period required under the CGST Rules. Failure to comply with e-invoicing requirements shall entitle the Client to withhold payment until a compliant invoice is presented.',
  'ई-चालान अनुपालन। सेवा प्रदाता CGST नियम 48(4) के अंतर्गत IRP के माध्यम से सभी चालान उत्पन्न करेगा, प्रत्येक पर वैध IRN और QR कोड सुनिश्चित करेगा। ई-चालान अनुपालन में विफलता पर ग्राहक भुगतान रोक सकता है।',
  'Mandatory for B2B suppliers with aggregate turnover above ₹5 Crore. Include in all procurement and vendor agreements.',
  'E-invoicing thresholds have been progressively lowered by CBIC. Check current threshold at the time of contracting.',
  'drafter_favours',
  ARRAY['CGST Act 2017', 'CGST Rules 2017'],
  ARRAY['Vendor Agreement', 'Procurement Agreement', 'MSA'],
  'Rule 48(4), CGST Rules 2017; CBIC Notification No. 17/2022-CT',
  'global'
),

(
  'TDS / TCS Withholding Obligation',
  'GST & Tax',
  'TAX DEDUCTION AT SOURCE AND TAX COLLECTION AT SOURCE. (a) The Client shall deduct Tax at Source ("TDS") or collect Tax at Source ("TCS") from payments made under this Agreement as required under the Income Tax Act 1961 and the applicable provisions of the CGST Act 2017 (Section 51, where applicable). (b) The Client shall deposit TDS/TCS amounts with the relevant tax authority within the statutory time-limit and furnish the applicable TDS/TCS certificate or e-TDS return to the Service Provider. (c) The Service Provider shall provide its PAN, TAN (if applicable), and GST registration details to the Client prior to the first payment. (d) Each party shall be responsible for its own tax compliance arising from this Agreement.',
  'स्रोत पर कर कटौती और संग्रह। ग्राहक आयकर अधिनियम 1961 और CGST अधिनियम की धारा 51 के अनुसार TDS/TCS काटेगा/संग्रहीत करेगा; निर्धारित अवधि में जमा करेगा; और TDS प्रमाण-पत्र प्रदान करेगा।',
  'Include in all contracts involving tax withholding — service agreements, real estate, and government contracts.',
  'GST TDS under Section 51 CGST Act applies only to specified government/governmental bodies. Income tax TDS under Chapter XVII has much broader application. Rates depend on nature of payment.',
  'neutral',
  ARRAY['Income Tax Act 1961', 'CGST Act 2017'],
  ARRAY['Vendor Agreement', 'Real Estate Agreement', 'Government Contract', 'MSA'],
  'Section 194C/194J, Income Tax Act 1961; Section 51, CGST Act 2017',
  'global'
),

-- EMPLOYMENT SPECIFIC (4) ---------------------------------------------------
(
  'Non-Solicitation of Employees',
  'Employment',
  'NON-SOLICITATION. For a period of twelve (12) months after the termination or expiry of this Agreement, each party (the "Restricted Party") shall not, directly or indirectly, solicit, recruit, hire, engage, or induce to leave the employment of the other party ("Protected Party") any person who is or was employed by or engaged as a consultant to the Protected Party within the preceding twelve (12) months, except where such employee or consultant has responded to a general recruitment advertisement not specifically directed at the Protected Party''s personnel.',
  'कर्मचारी गैर-आकर्षण। अनुबंध समाप्ति के बाद बारह महीने तक, प्रत्येक पक्ष दूसरे पक्ष के कर्मचारियों या सलाहकारों को प्रत्यक्ष या अप्रत्यक्ष रूप से आकर्षित, भर्ती, या नियुक्त नहीं करेगा।',
  'Include in all service agreements, consulting contracts, and joint ventures to protect workforce investment.',
  'Non-solicitation clauses are generally enforceable in India if reasonable in scope and duration. The 12-month period is market-standard. A blanket non-compete would be unenforceable under Section 27 of the Indian Contract Act 1872.',
  'neutral',
  ARRAY['Indian Contract Act 1872'],
  ARRAY['MSA', 'Consulting Agreement', 'Technology Agreement', 'Joint Venture'],
  'Section 27, Indian Contract Act 1872 (restraint of trade)',
  'global'
),

(
  'Garden Leave Clause',
  'Employment',
  'GARDEN LEAVE. Where the Company or the Employee has given notice of termination of employment: (a) the Company may, in its absolute discretion, require the Employee to remain away from the office, not attend work, and not have any contact with customers, suppliers, or employees of the Company or any Group Company, for all or part of the notice period ("Garden Leave Period"); (b) during the Garden Leave Period, the Employee shall remain an employee of the Company and shall continue to receive full salary, benefits, and contractual entitlements; (c) the Employee shall remain bound by all duties of fidelity and confidentiality during the Garden Leave Period; and (d) any garden leave served shall count towards any post-termination restriction period.',
  'गार्डन लीव खंड। नोटिस अवधि के दौरान, कंपनी कर्मचारी को कार्यालय से दूर रखने का अधिकार रखती है। इस दौरान कर्मचारी को पूरा वेतन और लाभ मिलेगा तथा वह निष्ठा और गोपनीयता के सभी कर्तव्यों से बाध्य रहेगा।',
  'Use in senior executive, key employee, and sales executive employment agreements to protect customer relationships and confidential information during transition.',
  'Garden leave must be supported by a contractual right — cannot be imposed unilaterally. Ensure salary continuation is unambiguous to support enforceability.',
  'drafter_favours',
  ARRAY['Indian Contract Act 1872', 'ID Act 1947'],
  ARRAY['Employment Agreement', 'Senior Executive Contract'],
  'Section 27, Indian Contract Act 1872',
  'global'
),

(
  'Post-Termination Non-Compete — Consideration-Supported',
  'Employment',
  'POST-TERMINATION NON-COMPETE. In consideration of the payment by the Company to the Employee of a non-compete payment equal to [three (3)] months'' basic salary ("Non-Compete Payment"), the Employee agrees that for a period of [six (6)] months after the termination of employment, the Employee shall not, directly or indirectly, be employed by, consult for, or otherwise provide services to any Competing Business in [India]. "Competing Business" means any business that directly competes with the Company''s core business of [description]. This restriction shall be void to the extent it is determined by a court of competent jurisdiction to be in restraint of trade. The Non-Compete Payment shall be forfeited if the Employee breaches this clause.',
  'समाप्ति-पश्चात गैर-प्रतिस्पर्धा। कंपनी तीन महीने के मूल वेतन के बदले में, कर्मचारी छह महीने तक भारत में किसी प्रतिस्पर्धी व्यवसाय के लिए काम नहीं करेगा। उल्लंघन पर गैर-प्रतिस्पर्धा भुगतान जब्त होगा।',
  'The ONLY way to make a post-termination non-compete partially enforceable in India is to pair it with adequate monetary consideration and narrow it carefully in scope, geography, and duration.',
  'Section 27 of the Indian Contract Act 1872 makes restraint of trade void. However, courts have occasionally upheld narrow non-competes backed by meaningful consideration. Do NOT rely on this clause without senior legal review.',
  'drafter_favours',
  ARRAY['Indian Contract Act 1872'],
  ARRAY['Employment Agreement', 'Senior Executive Contract'],
  'Section 27, Indian Contract Act 1872 (restraint of trade — use with caution)',
  'global'
),

(
  'ESOP Vesting Acceleration on Change of Control',
  'Employment',
  'ESOP ACCELERATION. Upon a Change of Control, the Employee''s unvested Employee Stock Options ("ESOPs") shall: (a) Cliff Vesting: if fewer than [twelve (12)] months have elapsed since grant date, fifty percent (50%) of unvested ESOPs shall immediately vest; (b) Full Acceleration: if the Employee''s employment is terminated without cause, or by the Employee for Good Reason, within twelve (12) months following a Change of Control, all remaining unvested ESOPs shall immediately vest. "Good Reason" means a material reduction in base salary, a material diminution in duties, or relocation of the primary place of work by more than 50 kilometres. Options accelerated under this clause must be exercised within ninety (90) days of the vesting date.',
  'ESOP वेस्टिंग त्वरण। स्वामित्व परिवर्तन पर: 50% अवेस्टेड ESOPs तत्काल वेस्ट होंगे; और यदि 12 महीने के भीतर बिना कारण समाप्ति हो, तो सभी शेष ESOPs तत्काल वेस्ट होंगे। त्वरित ESOPs का 90 दिन में प्रयोग किया जाना चाहिए।',
  'Include in ESOP agreements and senior executive employment contracts to protect employees'' equity during M&A transactions.',
  'Ensure the ESOP Plan and Articles of Association permit acceleration — otherwise contractual acceleration may conflict with corporate documents. Tax implications under Section 17(2)(vi) Income Tax Act should be assessed.',
  'counterparty_favours',
  ARRAY['SEBI (SBEB) Regulations 2021', 'Income Tax Act 1961', 'Companies Act 2013'],
  ARRAY['Employment Agreement', 'ESOP Agreement', 'Shareholder Agreement'],
  'SEBI (Share Based Employee Benefits and Sweat Equity) Regulations 2021',
  'global'
),

-- BOILERPLATE / GOVERNING LAW (4) -------------------------------------------
(
  'Governing Law — India',
  'Boilerplate / Governing Law',
  'GOVERNING LAW. This Agreement and any dispute or claim (including non-contractual disputes or claims) arising out of or in connection with it or its subject matter or formation shall be governed by and construed in accordance with the laws of India, without reference to its conflict of laws principles.',
  'शासी कानून — भारत। यह अनुबंध और इससे उत्पन्न या संबंधित कोई भी विवाद या दावा (गैर-संविदात्मक सहित), भारत के कानूनों के अनुसार शासित और व्याख्यायित होगा।',
  'Standard boilerplate for all domestic Indian commercial agreements.',
  'For cross-border agreements, specify which country''s law applies. "Without reference to conflict of laws" ensures the chosen law governs, not a foreign law chosen by conflict rules.',
  'neutral',
  ARRAY['Indian Contract Act 1872'],
  ARRAY['MSA', 'NDA', 'Technology Agreement', 'Employment Agreement', 'Vendor Agreement'],
  NULL,
  'global'
),

(
  'Entire Agreement / Integration Clause',
  'Boilerplate / Governing Law',
  'ENTIRE AGREEMENT. This Agreement (together with the Schedules and any documents referred to in it) constitutes the entire agreement between the parties with respect to the subject matter hereof and supersedes all prior agreements, arrangements, understandings, representations, warranties, and negotiations between the parties, whether oral or written, relating to such subject matter. Each party acknowledges that it has not relied on any representation, warranty, or statement other than as expressly set out in this Agreement. Nothing in this clause shall limit or exclude any liability for fraud.',
  'संपूर्ण समझौता खंड। यह अनुबंध अपने विषय-वस्तु के संबंध में पक्षों के बीच संपूर्ण समझौता है और सभी पूर्व समझौतों, व्यवस्थाओं, और वार्ताओं का स्थान लेता है। धोखाधड़ी के दायित्व पर कोई प्रतिबंध नहीं।',
  'Include in every written agreement to prevent claims based on pre-contract representations or side letters.',
  'The "fraud" carve-out is essential and non-negotiable. Courts will scrutinise entire agreement clauses in consumer/adhesion contracts — ensure both parties are sophisticated.',
  'neutral',
  ARRAY['Indian Contract Act 1872', 'Specific Relief Act 1963'],
  ARRAY['MSA', 'NDA', 'Technology Agreement', 'Commercial Contract'],
  'Section 91-92, Indian Evidence Act 1872 (parol evidence rule)',
  'global'
),

(
  'Severability',
  'Boilerplate / Governing Law',
  'SEVERABILITY. If any provision of this Agreement is held by a court or arbitral tribunal of competent jurisdiction to be invalid, illegal, or unenforceable in whole or in part, such invalidity, illegality, or unenforceability shall not affect the other provisions of this Agreement, all of which shall continue in full force and effect. The parties shall use their best endeavours to negotiate in good faith a replacement provision that is valid, legal, and enforceable and that, to the greatest extent possible, achieves the intended commercial effect of the provision it replaces.',
  'पृथक्करणीयता। यदि इस अनुबंध का कोई प्रावधान अवैध, अनुचित, या अप्रवर्तनीय माना जाए, तो शेष प्रावधान पूर्ण बल और प्रभाव में बने रहेंगे। पक्ष उक्त प्रावधान के स्थान पर एक वैध और प्रवर्तनीय विकल्प वार्ता करेंगे।',
  'Standard boilerplate. Prevents the invalidity of one clause from voiding the entire agreement.',
  'Courts in India have generally upheld severability clauses. The obligation to negotiate a replacement provision is commercially sensible but non-binding in practice.',
  'neutral',
  ARRAY['Indian Contract Act 1872'],
  ARRAY['MSA', 'NDA', 'Technology Agreement', 'Employment Agreement', 'Commercial Contract'],
  NULL,
  'global'
),

(
  'Waiver',
  'Boilerplate / Governing Law',
  'WAIVER. No failure or delay by either party in exercising any right, power, or privilege under this Agreement shall operate as a waiver thereof, nor shall any single or partial exercise of any right, power, or privilege preclude any further or other exercise thereof or the exercise of any other right, power, or privilege. No waiver of any right or remedy shall be effective unless made in writing and signed by a duly authorised representative of the waiving party.',
  'अधित्याग। इस अनुबंध के अंतर्गत किसी अधिकार का प्रयोग न करना या विलंब से प्रयोग करना उस अधिकार का त्याग नहीं माना जाएगा। कोई भी अधित्याग केवल अधिकृत प्रतिनिधि द्वारा लिखित रूप में ही प्रभावी होगा।',
  'Standard boilerplate to prevent conduct from implicitly waiving contractual rights.',
  'Courts can imply waiver from conduct even with this clause — ensure the clause is drafted broadly. The writing requirement for waivers should be strictly observed in practice.',
  'neutral',
  ARRAY['Indian Contract Act 1872'],
  ARRAY['MSA', 'NDA', 'Technology Agreement', 'Commercial Contract'],
  NULL,
  'global'
);

-- ---------------------------------------------------------------------------
-- 2 Org-Private Clauses for democorp
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_org_id UUID;
  v_user_id UUID;
BEGIN
  SELECT id INTO v_org_id FROM public.organizations WHERE slug = 'democorp' LIMIT 1;
  SELECT id INTO v_user_id FROM public.users WHERE email = 'admin@democorp.com' LIMIT 1;
  IF v_org_id IS NULL THEN RAISE NOTICE 'democorp org not found — skipping private clauses'; RETURN; END IF;

  INSERT INTO public.clauses (
    org_id, title, category, clause_text_en, clause_text_hi,
    use_case, risk_notes, party_position,
    applicable_acts, applicable_contract_types, visibility, created_by
  ) VALUES
  (
    v_org_id,
    'DemoCorp Standard Payment Terms — 45 Days',
    'Boilerplate / Governing Law',
    'PAYMENT TERMS. Unless otherwise specified in the relevant Order Form, the Client shall pay all invoices within forty-five (45) days of the invoice date. Interest shall accrue on overdue amounts at the rate of twelve percent (12%) per annum from the due date until the date of actual payment, both before and after judgment. The Service Provider reserves the right to suspend services upon sixty (60) days'' notice if any invoice remains unpaid for more than thirty (30) days beyond the due date.',
    'भुगतान शर्तें। ग्राहक चालान तिथि से 45 दिन के भीतर भुगतान करेगा। विलंबित राशि पर 12% प्रति वर्ष की दर से ब्याज लगेगा। 30 दिन से अधिक विलंब पर 60 दिन की नोटिस पर सेवाएं निलंबित की जा सकती हैं।',
    'DemoCorp standard payment clause for all outgoing service agreements.',
    'Organisation-specific — not suitable for agreements where client has already negotiated 30-day or 60-day terms.',
    'drafter_favours',
    ARRAY['Indian Contract Act 1872', 'MSME Act 2006'],
    ARRAY['MSA', 'SaaS Agreement', 'Consulting Agreement'],
    'org_private',
    v_user_id
  ),
  (
    v_org_id,
    'DemoCorp Audit Rights Clause',
    'Boilerplate / Governing Law',
    'AUDIT RIGHTS. The Client shall have the right, upon thirty (30) days'' prior written notice, to audit (or appoint an independent auditor to audit) the Service Provider''s records, systems, and facilities to the extent necessary to verify: (a) compliance with the Service Provider''s obligations under this Agreement; (b) the accuracy of the Service Provider''s invoices and time-and-materials charges; and (c) compliance with data protection obligations under the DPDP Act 2023. The Service Provider shall provide reasonable access and cooperation. The cost of any audit shall be borne by the Client, unless the audit reveals a material discrepancy of more than five percent (5%), in which case the cost shall be borne by the Service Provider.',
    'ऑडिट अधिकार। ग्राहक 30 दिन की सूचना पर अनुबंध अनुपालन, चालान सटीकता, और DPDP Act 2023 अनुपालन सत्यापन के लिए सेवा प्रदाता के रिकॉर्ड की जांच कर सकता है। 5% से अधिक विसंगति पर ऑडिट लागत सेवा प्रदाता वहन करेगा।',
    'DemoCorp standard audit rights for vendor and technology agreements above INR 50 lakh.',
    'Organisation-specific — tailor threshold and frequency for each vendor. Ensure audit scope does not inadvertently require disclosure of third-party confidential information.',
    'drafter_favours',
    ARRAY['Indian Contract Act 1872', 'DPDP Act 2023'],
    ARRAY['MSA', 'Technology Agreement', 'Outsourcing Agreement'],
    'org_private',
    v_user_id
  );
END $$;
