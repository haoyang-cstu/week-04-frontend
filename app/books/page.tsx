"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Book {
  id: number;
  title: string;
  author: string;
  status: string;
  rating: number;
}

export default function BooksPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchBooks() {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/books`);
        if (!res.ok) {
          throw new Error(`Request failed with status ${res.status}`);
        }
        const data: Book[] = await res.json();
        setBooks(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load books");
      } finally {
        setLoading(false);
      }
    }

    fetchBooks();
  }, []);

  if (loading) {
    return (
      <main className="p-8">
        <p className="text-gray-500">Loading books…</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="p-8">
        <p className="text-red-600">Error: {error}</p>
      </main>
    );
  }

  return (
    <main className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Books</h1>
        <Link
          href="/books/new"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
        >
          + Add a Book
        </Link>
      </div>
      {books.length === 0 ? (
        <p className="text-gray-500">No books yet.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {books.map((book) => (
            <div
              key={book.id}
              className="rounded-lg border border-gray-200 p-4 shadow-sm"
            >
              <h2 className="text-lg font-semibold">{book.title}</h2>
              <p className="text-sm text-gray-600">by {book.author}</p>
              <div className="mt-3 flex items-center justify-between text-sm">
                <span className="rounded-full bg-gray-100 px-2 py-1 text-gray-700">
                  {book.status}
                </span>
                <span className="text-yellow-600">★ {book.rating}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
