/**
 * Fresh Web Lite — Point 0 Design Principles.
 * Product-wide rules that precede ecosystem UI.
 */
export const FRESH_DESIGN_PRINCIPLES = [
  {id:"universal",name:"Universal",rule:"One platform for everyone; personalization changes representation, not identity."},
  {id:"simple",name:"Simple",rule:"Expose the smallest useful interface for the user's current intent."},
  {id:"consistent",name:"Consistent",rule:"One meaning, one visual language, one canonical component wherever possible."},
  {id:"adaptive",name:"Adaptive",rule:"Adapt to device, network, language, accessibility needs and context without fragmenting the platform."},
  {id:"accessible",name:"Accessible",rule:"Meaning remains available through text, voice, visual, semantic and assistive representations."},
  {id:"fast",name:"Fast",rule:"Prefer lightweight primitives and progressive enhancement."},
  {id:"trustworthy",name:"Trustworthy",rule:"States, permissions, actions and consequences should be understandable and reversible where possible."},
  {id:"authentic",name:"Authentic",rule:"Optimize for usefulness and genuine connection, not manipulative engagement."},
  {id:"extensible",name:"Extensible",rule:"New capabilities plug into shared primitives instead of creating parallel UI systems."},
] as const;
export type FreshDesignPrincipleId = typeof FRESH_DESIGN_PRINCIPLES[number]["id"];
