import { Client } from "pg";

async function query(queryObject: string) {
  const client = new Client({
    user: process.env.POSTGRES_USER,
    host: process.env.POSTGRES_HOST,
    database: process.env.POSTGRES_DB,
    password: process.env.POSTGRES_PASSWORD,
    port: 5432,
  });

  try {
    await client.connect();
    const result = await client.query(queryObject);
    return result;
  } catch (error) {
    console.error(error + " testeee");
    throw error;
  } finally {
    await client.end();
  }
}

export default {
  query: query,
};
