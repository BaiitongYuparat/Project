import { useEffect, useState } from "react";


export default function AI_PromptManagement() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {

    })

    return (
        <div className="space-y-5">
            <header className="flex flex-col gap-3 pb-2 text-left sm:flex-row sm:items-center sm:justify-between">
                <h1 className="text-xl font-bold text-stone-900 ">AI Prompt Management</h1>

            </header>

            
        </div>
    )
}