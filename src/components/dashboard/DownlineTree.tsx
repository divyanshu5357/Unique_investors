
"use client"

import React from 'react';
import { User, ChevronDown } from 'lucide-react';
import type { DownlineTreeData } from '@/lib/types'; 
import './DownlineTree.module.css';

interface DownlineTreeProps {
    data: DownlineTreeData | null;
}

const TreeNode = ({ name, id, isRoot = false, depth = 0 }: { name: string | null; id: string; isRoot?: boolean; depth?: number }) => {
    const getDepthColor = () => {
        switch(depth) {
            case 0: return 'bg-emerald-50 border-emerald-200 shadow-lg';
            case 1: return 'bg-blue-50 border-blue-200 shadow-md';
            case 2: return 'bg-purple-50 border-purple-200 shadow-md';
            default: return 'bg-primary/5 border-primary/20';
        }
    };

    const getDepthBadgeColor = () => {
        switch(depth) {
            case 0: return 'bg-emerald-100 text-emerald-700';
            case 1: return 'bg-blue-100 text-blue-700';
            case 2: return 'bg-purple-100 text-purple-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    const depthLabel = depth === 0 ? 'You' : `Level ${depth}`;

    return (
        <div className={`flex flex-col items-center text-center p-4 border-2 rounded-xl shadow-md min-w-[160px] transition-all duration-300 hover:scale-105 hover:shadow-xl node-entry ${getDepthColor()}`}>
            <div className={`flex items-center justify-center w-14 h-14 rounded-full mb-3 ${depth === 0 ? 'bg-emerald-100' : depth === 1 ? 'bg-blue-100' : 'bg-purple-100'}`}>
                <User className={`w-7 h-7 ${depth === 0 ? 'text-emerald-600' : depth === 1 ? 'text-blue-600' : 'text-purple-600'}`} />
            </div>
            <div className={`inline-block px-2 py-1 rounded-full text-xs font-semibold mb-2 ${getDepthBadgeColor()}`}>
                {depthLabel}
            </div>
            <p className="font-bold text-sm text-gray-900">{name || 'Unnamed Associate'}</p>
            <p className="text-xs text-gray-500 truncate w-full mt-1" title={id}>{id}</p>
        </div>
    );
};

const ConnectorLine = ({ childCount = 1, isVertical = true }: { childCount?: number; isVertical?: boolean }) => {
    if (isVertical) {
        return (
            <>
                {/* Vertical line with animated arrow */}
                <div className="relative w-px h-12 mx-auto vertical-connector">
                    <div className="absolute inset-0 bg-gradient-to-b from-emerald-300 to-blue-300"></div>
                    <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 arrow-down">
                        <ChevronDown className="w-5 h-5 text-blue-500" strokeWidth={3} />
                    </div>
                </div>
            </>
        );
    }
    return null;
};

const HorizontalConnector = ({ childCount }: { childCount: number }) => {
    if (childCount <= 1) return null;
    
    return (
        <div className="relative horizontal-connector" style={{ width: `${childCount * 200}px` }}>
            {/* Top horizontal line */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-400 to-transparent top-line"></div>
            
            {/* Vertical drops */}
            {Array.from({ length: childCount }).map((_, i) => (
                <div
                    key={i}
                    className="absolute top-0 h-3 w-px bg-blue-400"
                    style={{ left: `calc(50% + ${(i - (childCount - 1) / 2) * 200}px)` }}
                />
            ))}
        </div>
    );
};

const RecursiveTreeNode: React.FC<{ node: DownlineTreeData; depth?: number }> = ({ node, depth = 0 }) => {
    const hasChildren = node.children && node.children.length > 0;
    
    return (
        <li className="flex flex-col items-center relative">
            <div className="node-wrapper">
                <TreeNode name={node.full_name} id={node.id} depth={depth} isRoot={depth === 0} />
            </div>
            
            {hasChildren && (
                <>
                    {/* Vertical connector with arrow */}
                    <div className="connector-container">
                        <ConnectorLine childCount={node.children.length} />
                    </div>

                    {/* Horizontal connector for siblings */}
                    <div className="relative" style={{ width: '100%', minHeight: '20px' }}>
                        {node.children.length > 1 && (
                            <HorizontalConnector childCount={node.children.length} />
                        )}
                    </div>

                    {/* Children nodes */}
                    <ul className="flex justify-center gap-12 pt-4 children-list">
                        {node.children.map((child, index) => (
                            <RecursiveTreeNode 
                                key={child.id} 
                                node={child} 
                                depth={depth + 1}
                            />
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
            <div className="text-center py-12">
                <div className="flex items-center justify-center w-16 h-16 rounded-full bg-muted mx-auto mb-4 empty-state">
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
            <div className="text-center py-12">
                <div className="flex justify-center mb-6 single-node">
                    <TreeNode name={data.full_name} id={data.id} depth={0} isRoot={true} />
                </div>
                <p className="text-sm text-muted-foreground">No downline members</p>
                <p className="text-xs text-muted-foreground mt-1">This associate hasn't recruited anyone yet.</p>
            </div>
        );
    }

    return (
        <div className="downline-tree flex justify-center p-6 overflow-x-auto tree-container">
            <ul className="flex flex-col items-center">
                <RecursiveTreeNode node={data} depth={0} />
            </ul>
        </div>
    );
};
