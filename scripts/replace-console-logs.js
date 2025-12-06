/**
 * Script para reemplazar console.log/error/warn con logger
 * Ejecutar con: node scripts/replace-console-logs.js
 */

const fs = require('fs');
const path = require('path');

const appDir = path.join(__dirname, '..', 'app');

function replaceInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Verificar si ya tiene el import de logger
  const hasLoggerImport = content.includes("from '@/app/utils/logger'") || 
                         content.includes('from "@/app/utils/logger"');

  // Reemplazar console.log
  if (content.includes('console.log')) {
    content = content.replace(/console\.log\(/g, 'logger.log(');
    modified = true;
  }

  // Reemplazar console.error
  if (content.includes('console.error')) {
    content = content.replace(/console\.error\(/g, 'logger.error(');
    modified = true;
  }

  // Reemplazar console.warn
  if (content.includes('console.warn')) {
    content = content.replace(/console\.warn\(/g, 'logger.warn(');
    modified = true;
  }

  // Reemplazar console.info
  if (content.includes('console.info')) {
    content = content.replace(/console\.info\(/g, 'logger.info(');
    modified = true;
  }

  // Reemplazar console.debug
  if (content.includes('console.debug')) {
    content = content.replace(/console\.debug\(/g, 'logger.debug(');
    modified = true;
  }

  // Agregar import si es necesario y se hizo algún reemplazo
  if (modified && !hasLoggerImport) {
    // Buscar el último import
    const importRegex = /^import .+ from ['"].+['"];?$/gm;
    const imports = content.match(importRegex) || [];
    
    if (imports.length > 0) {
      const lastImport = imports[imports.length - 1];
      const lastImportIndex = content.lastIndexOf(lastImport);
      const insertIndex = lastImportIndex + lastImport.length;
      
      // Insertar el nuevo import después del último import
      content = content.slice(0, insertIndex) + 
                "\nimport { logger } from '@/app/utils/logger';" + 
                content.slice(insertIndex);
    } else {
      // Si no hay imports, agregar al principio después de 'use client' o 'use server' si existe
      const useDirectiveMatch = content.match(/^('use client'|'use server');?\n/);
      if (useDirectiveMatch) {
        const insertIndex = useDirectiveMatch[0].length;
        content = content.slice(0, insertIndex) + 
                  "import { logger } from '@/app/utils/logger';\n" + 
                  content.slice(insertIndex);
      } else {
        content = "import { logger } from '@/app/utils/logger';\n" + content;
      }
    }
  }

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    return true;
  }

  return false;
}

function processDirectory(dir) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      // Saltar node_modules y .next
      if (file !== 'node_modules' && file !== '.next' && file !== '__tests__') {
        processDirectory(filePath);
      }
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      if (replaceInFile(filePath)) {
        console.log(`Updated: ${filePath}`);
      }
    }
  });
}

console.log('Reemplazando console.log/error/warn con logger...');
processDirectory(appDir);
console.log('¡Completado!');

