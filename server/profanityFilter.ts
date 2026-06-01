// Profanity filter for chat messages
const BANNED_WORDS = [
  // Racial slurs
  'n-word', 'nword', 'n word', 'nigger', 'nigga', 'faggot', 'fag',
  // Sexual terms and insults
  'fuck', 'fucking', 'fuckhead', 'motherfucker', 'shit', 'shitty', 'piss', 'asshole', 'bitch', 'bitches', 'bastard', 'damn', 'dammit', 'crap', 'cock', 'pussy', 'dick', 'dickhead', 'slut', 'whore', 'ho',
  // Derogatory terms
  'retard', 'retarded', 'stupid', 'idiot', 'dumbass', 'moron', 'imbecile', 'jackass', 'douche', 'douchebag', 'asshat', 'scumbag', 'prick', 'jerk', 'dickwad',
  // Offensive slurs
  'chink', 'gook', 'spic', 'wetback', 'raghead', 'kike', 'honky', 'cracker',
  // Religious/ethnic insults  
  'jihadi', 'terrorist',
  // Other offensive terms
  'gay', 'lesbian', 'tranny', 'trap', 'homo', 'queer', 'dyke',
  // Additional profanity variations
  'bullshit', 'horseshit', 'cunt', 'cunthead', 'cocksucker', 'twat', 'wank', 'bollocks', 'arse',
];

function escapeCensoredWord(word: string): string {
  return '[CENSORED]';
}

export function censorProfanity(text: string): string {
  if (!text) return text;
  
  let censored = text;
  
  // Create case-insensitive regex patterns for each banned word
  for (const bannedWord of BANNED_WORDS) {
    // Match word boundaries to avoid partial matches
    const regex = new RegExp(`\\b${bannedWord}\\b`, 'gi');
    censored = censored.replace(regex, escapeCensoredWord(bannedWord));
  }
  
  return censored;
}
