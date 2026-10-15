import { DatabaseSync } from 'node:sqlite'

export function testD1(database: DatabaseSync) {
  let serial: Promise<unknown> = Promise.resolve()
  const prepare = (sql: string) => {
    const statement = (values: (string | number | null)[]) => ({
      bind: (...next: (string | number | null)[]) => statement(next),
      first: async () => database.prepare(sql).get(...values) ?? null,
      all: async () => ({ results: database.prepare(sql).all(...values), success: true }),
      run: async () => ({ meta: { changes: Number(database.prepare(sql).run(...values).changes) }, success: true }),
    })
    return statement([])
  }
  return { prepare, batch: (statements: { run: () => Promise<unknown> }[]) => {
    const result = serial.then(async () => {
      database.exec('BEGIN')
      try { const values = []; for (const statement of statements) values.push(await statement.run()); database.exec('COMMIT'); return values }
      catch (error) { database.exec('ROLLBACK'); throw error }
    })
    serial = result.catch(() => undefined)
    return result
  } }
}
