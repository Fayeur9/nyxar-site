const c = {
  // --- Styles ---
  reset:     '\x1b[0m',
  bold:      '\x1b[1m',
  dim:       '\x1b[2m',
  italic:    '\x1b[3m',
  underline: '\x1b[4m',
  blink:     '\x1b[5m',
  strikethrough: '\x1b[9m',

  // --- Couleurs de texte (foreground) ---
  black:   '\x1b[30m',
  red:     '\x1b[31m',
  green:   '\x1b[32m',
  yellow:  '\x1b[33m',
  blue:    '\x1b[34m',
  magenta: '\x1b[35m',
  cyan:    '\x1b[36m',
  white:   '\x1b[37m',

  // --- Couleurs de texte claires (bright) ---
  blackBright:   '\x1b[90m',
  redBright:     '\x1b[91m',
  greenBright:   '\x1b[92m',
  yellowBright:  '\x1b[93m',
  blueBright:    '\x1b[94m',
  magentaBright: '\x1b[95m',
  cyanBright:    '\x1b[96m',
  whiteBright:   '\x1b[97m',
};

console.log(`
${c.cyan}  
  ╔═════════════════════════════════════════════════════╗
  ║                                                     ║    
  ║            ███████╗██╗████████╗███████╗             ║
  ║            ██╔════╝██║╚══██╔══╝██╔════╝             ║
  ║            ███████╗██║   ██║   █████╗               ║
  ║            ╚════██║██║   ██║   ██╔══╝               ║
  ║            ███████║██║   ██║   ███████╗             ║
  ║            ╚══════╝╚═╝   ╚═╝   ╚══════╝             ║
  ║    ███╗   ██╗██╗   ██╗██╗  ██╗ █████╗ ███████╗      ║
  ║    ████╗  ██║╚██╗ ██╔╝╚██╗██╔╝██╔══██╗██╔═══██╗     ║
  ║    ██╔██╗ ██║ ╚████╔╝  ╚███╔╝ ███████║███████╔╝     ║
  ║    ██║╚██╗██║  ╚██╔╝   ██╔██╗ ██╔══██║██╔═══██╗     ║
  ║    ██║ ╚████║   ██║   ██╔╝ ██╗██║  ██║██║   ██║     ║
  ║    ╚═╝  ╚═══╝   ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝   ╚═╝     ║
  ║                                                     ║                   
  ╚═════════════════════════════════════════════════════╝
${c.reset}  Made by ${c.cyan+c.underline+c.italic+c.bold}Fayeur${c.reset} and ${c.cyan+c.underline+c.italic+c.bold}D0litox${c.reset}
${c.reset}
  backend  →  ${c.cyan+c.underline+c.italic}http://localhost:5176${c.reset}
  frontend →  ${c.cyan+c.underline+c.italic}http://localhost:5173${c.reset}
`);
