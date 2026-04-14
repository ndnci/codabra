export interface DatabaseDialectEntry {
    readonly name: string;
    readonly label: string;
}

export const sqlite: DatabaseDialectEntry = { name: "sqlite", label: "SQLite" };
export const postgresql: DatabaseDialectEntry = { name: "postgresql", label: "PostgreSQL" };
export const mysql: DatabaseDialectEntry = { name: "mysql", label: "MySQL" };

export const allDialects: readonly DatabaseDialectEntry[] = [sqlite, postgresql, mysql];
