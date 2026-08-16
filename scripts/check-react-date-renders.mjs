import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import ts from "typescript";

const root = path.resolve("client/src");
const dateFields = /(?:datum|date|createdAt|updatedAt|ausgabeDatum|rueckgabeDatum|unterweisungsDatum|naechsteFaelligkeit|faelligkeit|durchgefuehrtAm|bestaetigtAm|signiertAm|checkInZeit|gueltigAb|gueltigBis)$/i;

async function files(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => entry.isDirectory() ? files(path.join(dir, entry.name)) : entry.name.endsWith(".tsx") ? [path.join(dir, entry.name)] : []));
  return nested.flat();
}

const findings = [];
for (const file of await files(root)) {
  const source = await readFile(file, "utf8");
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const visit = (node) => {
    if (ts.isJsxExpression(node) && node.expression && ts.isPropertyAccessExpression(node.expression)) {
      const field = node.expression.name.text;
      // value-/defaultValue-Attribute von Eingabefeldern sind keine React-Kinder;
      // sie dürfen Date-Strings zur Steuerung eines Formulars erhalten.
      const isAttributeValue = ts.isJsxAttribute(node.parent) && ["value", "defaultValue"].includes(node.parent.name.text);
      if (dateFields.test(field) && !isAttributeValue) {
        const { line, character } = ast.getLineAndCharacterOfPosition(node.expression.getStart(ast));
        findings.push(`${path.relative(process.cwd(), file)}:${line + 1}:${character + 1} → ${node.expression.getText(ast)}`);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(ast);
}

if (findings.length) {
  console.error("Direkte potenzielle Date-Ausgaben in JSX gefunden:\n" + findings.join("\n"));
  process.exitCode = 1;
} else {
  console.log("React-Date-Renderprüfung bestanden: Keine direkten Datumsobjekte als JSX-Kinder gefunden.");
}
