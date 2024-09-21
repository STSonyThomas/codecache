"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
	Card,
	CardHeader,
	CardTitle,
	CardContent,
	CardFooter,
} from "@/components/ui/card";

// Define a snippet type
type SnippetRequest = {
	_id: string;
	title: string;
	language: string;
	code: string;
	description?: string;
	tags?: string[];
	approved: boolean;
};

export default function AdminPage() {
	const [snippetRequests, setSnippetRequests] = useState<SnippetRequest[]>(
		[]
	);

	// Fetch pending snippet requests (unapproved)
	useEffect(() => {
		async function fetchRequests() {
			try {
				const response = await fetch("/api/request"); // Fetch all pending requests (unapproved snippets)
				const data = await response.json();
				setSnippetRequests(data);
			} catch (error) {
				console.error("Error fetching requests:", error);
				toast.error("Failed to load requests");
			}
		}

		fetchRequests();
	}, []);

	// Approve snippet request
	const handleAccept = async (requestId: string) => {
		try {
			const response = await fetch("/api/request/accept", {
				method: "PATCH",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ requestId }),
			});

			if (response.ok) {
				setSnippetRequests((prev) =>
					prev.filter((request) => request._id !== requestId)
				);
				toast.success("Snippet accepted and added to the database!");
			} else {
				toast.error("Failed to accept snippet request.");
			}
		} catch (error) {
			console.error(error);
			toast.error("Error accepting snippet request.");
		}
	};

	const handleReject = async (requestId: string) => {
		try {
			const response = await fetch("/api/request/reject", {
				method: "DELETE",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ requestId }),
			});

			if (response.ok) {
				setSnippetRequests((prev) =>
					prev.filter((request) => request._id !== requestId)
				);
				toast.success("Snippet request rejected and deleted.");
			} else {
				toast.error("Failed to reject snippet request.");
			}
		} catch (error) {
			console.error(error);
			toast.error("Error rejecting snippet request.");
		}
	};

	return (
		<div className="p-8">
			<h1 className="text-2xl font-bold mb-6">Snippet Requests</h1>
			<div className="grid grid-cols-1 gap-6">
				{snippetRequests.map((request) => (
					<Card key={request._id}>
						<CardHeader>
							<CardTitle>{request.title}</CardTitle>
						</CardHeader>
						<CardContent>
							<p>Language: {request.language}</p>
							<pre>{request.code}</pre>
							{request.description && (
								<p>{request.description}</p>
							)}
							{request.tags && (
								<p>Tags: {request.tags.join(", ")}</p>
							)}
						</CardContent>
						<CardFooter className="flex justify-end gap-4">
							<Button onClick={() => handleAccept(request._id)}>
								Approve
							</Button>
							<Button
								onClick={() => handleReject(request._id)}
								variant="destructive"
							>
								Reject
							</Button>
						</CardFooter>
					</Card>
				))}
			</div>
		</div>
	);
}