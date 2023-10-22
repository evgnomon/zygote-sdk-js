import { assert } from "chai";

import { DB } from "../src/index";

describe("DB.query", function () {
  let db;
  before(async function () {
    db = new DB(1);
  });
  after(async function () {
    await db.close();
  });

  const testParams = [
    {
      name: "select users",
      query: "select * from users where username IN ('john_doe', 'sam_smith');",
      results: [
        {
          id: 1,
          username: "john_doe",
          password: "hashed_password1",
          email_address: "john.doe@email.com",
          phone_number: "+1234567890",
        },
        {
          id: 3,
          username: "sam_smith",
          password: "hashed_password3",
          email_address: "sam.smith@email.com",
          phone_number: "+1122334455",
        },
      ],
      fields: [
        {
          catalog: "def",
          db: "myproject_1",
          table: "users",
          orgTable: "users",
          name: "id",
          orgName: "id",
          charsetNr: 63,
          length: 11,
          type: 3,
          flags: 16899,
          decimals: 0,
          zeroFill: false,
          protocol41: true,
        },
        {
          catalog: "def",
          db: "myproject_1",
          table: "users",
          orgTable: "users",
          name: "username",
          orgName: "username",
          charsetNr: 33,
          length: 765,
          type: 253,
          flags: 20485,
          decimals: 0,
          zeroFill: false,
          protocol41: true,
        },
        {
          catalog: "def",
          db: "myproject_1",
          table: "users",
          orgTable: "users",
          name: "password",
          orgName: "password",
          charsetNr: 33,
          length: 765,
          type: 253,
          flags: 4097,
          decimals: 0,
          zeroFill: false,
          protocol41: true,
        },
        {
          catalog: "def",
          db: "myproject_1",
          table: "users",
          orgTable: "users",
          name: "email_address",
          orgName: "email_address",
          charsetNr: 33,
          length: 765,
          type: 253,
          flags: 20485,
          decimals: 0,
          zeroFill: false,
          protocol41: true,
        },
        {
          catalog: "def",
          db: "myproject_1",
          table: "users",
          orgTable: "users",
          name: "phone_number",
          orgName: "phone_number",
          charsetNr: 33,
          length: 60,
          type: 253,
          flags: 20485,
          decimals: 0,
          zeroFill: false,
          protocol41: true,
        },
      ],
    },
    {
      query:
        "select id, title, author, publication_year, description from books;",
      results: [
        {
          id: 1,
          title: "1984",
          author: "George Orwell",
          publication_year: 1949,
          description: "Dystopian novel",
        },
        {
          id: 2,
          title: "To Kill a Mockingbird",
          author: "Harper Lee",
          publication_year: null,
          description: null,
        },
        {
          id: 3,
          title: "The Great Gatsby",
          author: "F. Scott Fitzgerald",
          publication_year: 1925,
          description: null,
        },
        {
          id: 4,
          title: "Moby-Dick",
          author: "Herman Melville",
          publication_year: null,
          description: null,
        },
      ],
      fields: [
        {
          catalog: "def",
          db: "myproject_1",
          table: "books",
          orgTable: "books",
          name: "id",
          orgName: "id",
          charsetNr: 63,
          length: 11,
          type: 3,
          flags: 16899,
          decimals: 0,
          zeroFill: false,
          protocol41: true,
        },
        {
          catalog: "def",
          db: "myproject_1",
          table: "books",
          orgTable: "books",
          name: "title",
          orgName: "title",
          charsetNr: 33,
          length: 765,
          type: 253,
          flags: 4097,
          decimals: 0,
          zeroFill: false,
          protocol41: true,
        },
        {
          catalog: "def",
          db: "myproject_1",
          table: "books",
          orgTable: "books",
          name: "author",
          orgName: "author",
          charsetNr: 33,
          length: 765,
          type: 253,
          flags: 4097,
          decimals: 0,
          zeroFill: false,
          protocol41: true,
        },
        {
          catalog: "def",
          db: "myproject_1",
          table: "books",
          orgTable: "books",
          name: "publication_year",
          orgName: "publication_year",
          charsetNr: 63,
          length: 11,
          type: 3,
          flags: 0,
          decimals: 0,
          zeroFill: false,
          protocol41: true,
        },
        {
          catalog: "def",
          db: "myproject_1",
          table: "books",
          orgTable: "books",
          name: "description",
          orgName: "description",
          charsetNr: 33,
          length: 196605,
          type: 252,
          flags: 16,
          decimals: 0,
          zeroFill: false,
          protocol41: true,
        },
      ],
    },
  ];

  for (const { query, results, fields } of testParams) {
    describe(`with ${query}`, function () {
      let actualResults, actualFields;
      before(async function () {
        [actualResults, actualFields] = await db.query(query);
      });
      it("returns desired results", function () {
        assert.deepStrictEqual(actualResults, results);
      });
      it("returns desired fields", function () {
        assert.deepStrictEqual(
          JSON.parse(JSON.stringify(actualFields)),
          fields
        );
      });
    });
  }
});
