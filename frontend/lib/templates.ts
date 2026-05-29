// Phase 1 ships a single, hard-coded template. Its content mirrors
// sample_data/template_ct_abdomen.md and is sent verbatim to the backend
// /structure endpoint (the backend reads the NORMAL statements from it).
// Phase 2 replaces this with an uploadable, server-stored template library.

export interface Template {
  id: string;
  name: string;
  content: string;
}

const CT_ABDOMEN = `# Template: CT Abdomen (Non-Contrast)

# Each section lists the organ and its DEFAULT NORMAL statement.
# The structuring LLM uses the normal statement whenever the doctor does NOT
# mention that organ. Positive findings spoken by the doctor override the normal.

LIVER:
  normal: "Liver is normal in size and attenuation. No focal lesion. No intrahepatic biliary dilatation."

GALLBLADDER:
  normal: "Gallbladder is normal in distension with no calculus or wall thickening."

PANCREAS:
  normal: "Pancreas is normal in size and attenuation. No focal lesion or peripancreatic fat stranding."

SPLEEN:
  normal: "Spleen is normal in size and attenuation. No focal lesion."

KIDNEYS:
  normal: "Both kidneys are normal in size, position and attenuation. No calculus, no hydronephrosis."

ADRENAL GLANDS:
  normal: "Both adrenal glands are normal in size and morphology."

URINARY BLADDER:
  normal: "Urinary bladder is normal in distension with smooth walls."

BOWEL:
  normal: "Visualised bowel loops are normal in calibre with no wall thickening."

PERITONEUM:
  normal: "No free fluid or free air in the peritoneal cavity. No significant lymphadenopathy."

BONES:
  normal: "Visualised bony structures are unremarkable."

IMPRESSION:
  rule: "Summarise ONLY the positive (abnormal) findings spoken by the doctor. If everything is normal, write 'No significant abnormality detected.'"
`;

export const TEMPLATES: Template[] = [
  { id: "ct-abdomen", name: "CT Abdomen (Non-Contrast)", content: CT_ABDOMEN },
];
