"use client";

import { catchError } from "next/error";

function PricesUnavailable() {
  return (
    <p role="alert" className="mt-6 rounded-md bg-red-50 p-4 text-red-800">
      The page could not load prices from the database. Try again later.
    </p>
  );
}

export default catchError(PricesUnavailable);
