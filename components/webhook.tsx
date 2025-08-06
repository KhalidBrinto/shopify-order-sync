"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

interface Webhook {
  id: number;
  address: string;
  topic: string;
}

export default function WebhookManager() {
  const [webhooks, setWebhooks] = useState<Webhook[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState("");

  const fetchWebhooks = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/webhook");
      const data = await res.json();
      setWebhooks(data.webhooks || []);
    } catch (err) {
      setError("Failed to load webhooks.");
    } finally {
      setLoading(false);
    }
  };

  const registerWebhooks = async () => {
    setRegistering(true);
    try {
      const res = await fetch("/api/webhook/register", { method: "GET" });
      const data = await res.json();
      if (Array.isArray(data.webhooks) && data.webhooks.length > 0) {
        setWebhooks(data.webhooks);
      } else {
        alert("Webhook registration failed or returned no webhooks.");
      }
    } catch (err) {
      alert("Failed to register webhooks.");
    } finally {
      setRegistering(false);
    }
  };

  useEffect(() => {
    fetchWebhooks();
  }, []);

  return (
    <div className="max-w-6xl mx-auto mt-12 px-6">
      <div className="bg-white rounded-2xl shadow-md p-6 border">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Shopify Webhooks</h2>

        {loading ? (
          <div className="text-gray-600 flex items-center gap-2">
            <span className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full"></span>
            Loading webhooks...
          </div>
        ) : error ? (
          <p className="text-red-500">{error}</p>
        ) : webhooks && webhooks.length > 0 ? (
          <ul className="flex gap-4">
            {webhooks.map((wh) => (
              <li
                key={wh.id}
                className="bg-gray-50 border border-gray-200 rounded-lg p-4"
              >
                <div className="text-sm text-gray-500">Topic</div>
                <div className="font-semibold text-gray-800">{wh.topic}</div>
                <div className="text-sm text-gray-500 mt-2">Address</div>
                <div className="break-all text-gray-700">{wh.address}</div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-center space-y-4">
            <p className="text-gray-600">No webhooks found.</p>
            <Button
              onClick={registerWebhooks}
              className={`px-6 py-3 rounded-lg text-white transition font-medium ${
                registering
                  ? "bg-blue-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
              disabled={registering}
            >
              {registering ? "Registering..." : "Register Webhooks"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
