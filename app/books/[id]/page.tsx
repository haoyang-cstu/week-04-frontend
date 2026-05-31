"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Book {
  id: number;
  title: string;
  author: string;
  status: string;
  rating: number | null;
}

export default function BookDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    async function fetchBook() {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/books/${id}`
        );
        if (!res.ok) {
          throw new Error(`Request failed with status ${res.status}`);
        }
        const data: Book = await res.json();
        setBook(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load book");
      } finally {
        setLoading(false);
      }
    }

    fetchBook();
  }, [id]);

  async function handleMarkAsRead() {
    if (!book) return;
    setIsUpdating(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/books/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...book, status: "read" }),
      });
      if (!res.ok) throw new Error("Failed to update book");
      const updated: Book = await res.json();
      setBook(updated);
    } catch (err) {
      alert("Error updating book");
    } finally {
      setIsUpdating(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this book?")) return;
    setIsUpdating(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/books/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete book");
      router.push("/books");
    } catch (err) {
      alert("Error deleting book");
      setIsUpdating(false);
    }
  }

  if (loading) {
    return (
      <main className="p-8">
        <p className="text-gray-500">Loading book…</p>
      </main>
    );
  }

  if (error || !book) {
    return (
      <main className="p-8">
        <p className="text-red-600">Error: {error ?? "Book not found"}</p>
        <Link href="/books" className="text-sm text-blue-600 hover:underline">
          ← Back to list
        </Link>
      </main>
    );
  }

  return (
    <main className="p-8">
      <Link
        href="/books"
        className="text-sm text-blue-600 hover:underline"
      >
        ← Back to list
      </Link>

      <div className="mt-4 max-w-md rounded-lg border border-gray-200 p-6 shadow-sm">
        <h1 className="text-2xl font-bold">{book.title}</h1>
        <p className="mt-1 text-gray-600">by {book.author}</p>
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="rounded-full bg-gray-100 px-2 py-1 text-gray-700">
            {book.status}
          </span>
          <span className="text-yellow-600">
            {book.rating != null ? `★ ${book.rating}` : "Unrated"}
          </span>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={handleMarkAsRead}
            disabled={isUpdating || book.status === "read"}
            className="rounded-md bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {book.status === "read" ? "Already Read" : "Mark as Read"}
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isUpdating}
            className="rounded-md bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Delete
          </button>
        </div>
      </div>
    </main>
  );
}
