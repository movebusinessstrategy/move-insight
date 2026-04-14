const fs   = require('fs');
const path = require('path');

console.log('\n🔍 Procurando users.json...');
console.log('   Pasta atual:', __dirname);

const possiveis = [
  path.join(__dirname, 'data', 'users.json'),
  path.join(__dirname, 'users.json'),
];

let arquivo = null;
for (const p of possiveis) {
  if (fs.existsSync(p)) {
    arquivo = p;
    console.log('   ✅ Encontrado em:', p);
    break;
  } else {
    console.log('   ✗ Nao encontrado:', p);
  }
}

if (!arquivo) {
  console.log('\n❌ users.json nao encontrado.');
  console.log('   Conteudo da pasta:');
  fs.readdirSync(__dirname).forEach(f => console.log('   -', f));
  const dataDir = path.join(__dirname, 'data');
  if (fs.existsSync(dataDir)) {
    console.log('   Conteudo de data/:');
    fs.readdirSync(dataDir).forEach(f => console.log('   -', f));
  } else {
    console.log('   Pasta data/ nao existe.');
    console.log('   Crie sua conta em: http://localhost:3000/setup');
  }
  process.exit(1);
}

const users = JSON.parse(fs.readFileSync(arquivo, 'utf8'));
console.log('\n📋 Usuarios:');
users.forEach((u, i) => {
  console.log('  ', i+1, u.nome, '|', u.email, '| plano:', u.plano);
});

const u = users.find(u => u.email === 'lucasfelipemacena@icloud.com');
if (!u) {
  console.log('\n❌ Email nao encontrado. Crie a conta primeiro.');
  process.exit(1);
}

u.plano = 'owner';
u.admin = true;
u.ativo = true;
fs.writeFileSync(arquivo, JSON.stringify(users, null, 2));

console.log('\n✅ PRONTO! Plano:', u.plano);
console.log('➡️  Acesse: http://localhost:3000/logout\n');
