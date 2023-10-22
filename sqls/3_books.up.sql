CREATE TABLE books (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    author VARCHAR(255) NOT NULL,
    publication_year INT,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert a book with all details
INSERT INTO books (title, author, publication_year, description) VALUES ('1984', 'George Orwell', 1949, 'Dystopian novel');

-- Insert a book with missing publication_year and description
INSERT INTO books (title, author) VALUES ('To Kill a Mockingbird', 'Harper Lee');

-- Insert a book with missing description
INSERT INTO books (title, author, publication_year) VALUES ('The Great Gatsby', 'F. Scott Fitzgerald', 1925);

-- Insert a book with only title and author, letting created_at and updated_at use default values
INSERT INTO books (title, author) VALUES ('Moby-Dick', 'Herman Melville');
