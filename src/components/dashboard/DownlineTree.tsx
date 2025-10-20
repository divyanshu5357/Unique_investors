
"use client"

import React from 'react';
import { User } from 'lucide-react';
import type { DownlineTreeData } from '@/lib/types'; 

interface DownlineTreeProps {
    data: DownlineTreeData | null;
}

const TreeNode = ({ name, id }: { name: string | null; id: string }) => (
    <div className="flex flex-col items-center text-center p-3 border-2 border-primary/20 bg-primary/5 rounded-lg shadow-md min-w-[150px] relative">
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-2">
            <User className="w-6 h-6 text-primary" />
        </div>
        <p className="font-semibold text-sm text-black">{name || 'Unnamed Associate'}</p>
        <p className="text-xs text-muted-foreground truncate w-full" title={id}>{id}</p>
    </div>
);


const RecursiveTreeNode: React.FC<{ node: DownlineTreeData }> = ({ node }) => {
    const hasChildren = node.children && node.children.length > 0;
    return (
        <li className="flex flex-col items-center relative">
            <TreeNode name={node.full_name} id={node.id} />
            {hasChildren && (
                 <>
                    {/* Vertical connector line */}
                    <div className="absolute top-full h-8 w-px bg-border" />
                    <ul className="flex justify-center gap-8 pt-8">
                        {node.children.map(child => (
                           <RecursiveTreeNode key={child.id} node={child} />
                        ))}
                    </ul>
                </>
            )}
        </li>
    );
};


export const DownlineTree: React.FC<DownlineTreeProps> = ({ data }) => {
    if (!data) {
        return (
            <div className="text-center py-8">
                <div className="flex items-center justify-center w-16 h-16 rounded-full bg-muted mx-auto mb-4">
                    <User className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">No downline structure available.</p>
                <p className="text-xs text-muted-foreground mt-1">This associate doesn't have any downline members yet.</p>
            </div>
        );
    }

    // Check if the broker has any children
    const hasDownline = data.children && data.children.length > 0;
    
    if (!hasDownline) {
        return (
            <div className="text-center py-8">
                <div className="flex justify-center mb-6">
                    <TreeNode name={data.full_name} id={data.id} />
                </div>
                <p className="text-sm text-muted-foreground">No downline members</p>
                <p className="text-xs text-muted-foreground mt-1">This associate hasn't recruited anyone yet.</p>
            </div>
        );
    }

    return (
        <div className="downline-tree flex justify-center p-4 overflow-x-auto">
            <ul className="flex flex-col items-center">
                <RecursiveTreeNode node={data} />
            </ul>
        </div>
    );
};
