# SSHXplorer - Remote Development Extension

SSHXplorer is een krachtige extensie voor VS Code-gebaseerde IDE's die naadloze remote development via SSH mogelijk maakt. Perfect voor het werken met VPS servers, cloud instances en remote development omgevingen.

## Features

- 🔒 **Veilige SSH Verbindingen**
  - Ondersteuning voor SSH key authenticatie
  - Password-based authenticatie met veilige opslag
  - Auto-reconnect bij verbindingsverlies

- 📁 **Remote Bestandsbeheer**
  - Volledige bestandsverkenner voor remote bestanden
  - Drag-and-drop functionaliteit
  - Basis bestandsoperaties (kopiëren, plakken, hernoemen, verwijderen)

- 🖥️ **Geïntegreerde Terminal**
  - Direct toegang tot remote shell
  - Multi-terminal ondersteuning
  - Command history en auto-completion

- 🛠️ **Developer Experience**
  - Status indicator in de IDE
  - Quick-connect functionaliteit
  - Multi-workspace ondersteuning
  - VS Code thema integratie

- 📚 **Interactive Tutorial**
  - Built-in step-by-step tutorial
  - Learn key features and shortcuts
  - Interactive command examples
  - Progress tracking
  - Can be started anytime via Command Palette

## Installatie

1. Download de laatste versie van SSHXplorer
2. Installeer de extensie in je IDE:
   - Windsurf: Via Extensions panel
   - VS Code: Via VSIX installatie
   - Cursor: Via Extensions marketplace

## Gebruik

1. Open de Command Palette (Ctrl+Shift+P)
2. Type "SSHXplorer: Connect" en druk op Enter
3. Vul je SSH verbindingsgegevens in:
   - Host (IP of domeinnaam)
   - Port (standaard: 22)
   - Username
   - Authenticatie methode (SSH key of password)

## SSH Sleutel Configuratie

### Genereer een nieuwe SSH key
```bash
ssh-keygen -t ed25519 -C "jouw@email.com"
```

### Kopieer je public key naar de server
```bash
ssh-copy-id gebruiker@server
```

## Configuratie

SSHXplorer kan worden geconfigureerd via:
1. VS Code settings (settings.json)
2. Workspace settings
3. SSH config file (~/.ssh/config)

### Voorbeeld SSH Config
```
Host mijn-vps
    HostName 123.456.789.0
    User username
    Port 22
    IdentityFile ~/.ssh/id_ed25519
```

## Troubleshooting

### Veelvoorkomende Problemen

1. **Verbinding wordt geweigerd**
   - Controleer of SSH service actief is
   - Verifieer firewall instellingen
   - Check SSH key permissions

2. **Authentication Failed**
   - Controleer gebruikersnaam
   - Verifieer SSH key path
   - Check server logs

3. **Trage Verbinding**
   - Gebruik compression in SSH config
   - Check netwerk latency
   - Optimaliseer SSH instellingen

## Development

### Vereisten
- Node.js 16.x of hoger
- npm 7.x of hoger
- TypeScript 5.x

### Build Process
```bash
# Installeer dependencies
npm install

# Compileer de extensie
npm run compile

# Package voor distributie
npm run package
```

## Security Best Practices

1. Gebruik altijd SSH keys voor authenticatie
2. Bewaar geen wachtwoorden in plaintext
3. Houd je SSH client en server up-to-date
4. Gebruik sterke SSH keys (ED25519 of RSA 4096+)
5. Beperk SSH toegang via firewall regels

## Contributing

1. Fork de repository
2. Creëer een feature branch
3. Commit je wijzigingen
4. Push naar de branch
5. Open een Pull Request

## License

Dit project is gelicenseerd onder de MIT License - zie het [LICENSE](LICENSE) bestand voor details.
