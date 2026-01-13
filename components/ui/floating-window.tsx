"use client"

import React, { useState, useRef, useEffect } from "react"
import { createPortal } from "react-dom"
import { X, GripHorizontal, Maximize2, Minimize2 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface FloatingWindowProps {
    title: string
    onClose: () => void
    children: React.ReactNode
    initialWidth?: number
    initialHeight?: number
}

export function FloatingWindow({
    title,
    onClose,
    children,
    initialWidth = 800,
    initialHeight = 600,
}: FloatingWindowProps) {
    const [position, setPosition] = useState({ x: 50, y: 50 })
    const [size, setSize] = useState({ width: initialWidth, height: initialHeight })
    const [isDragging, setIsDragging] = useState(false)
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
    const [isMaximized, setIsMaximized] = useState(false)
    const [preMaximizeState, setPreMaximizeState] = useState<{ x: number, y: number, w: number, h: number } | null>(null)
    const [mounted, setMounted] = useState(false)

    const windowRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        setMounted(true)
        // Center initially
        if (typeof window !== "undefined") {
            const x = (window.innerWidth - initialWidth) / 2
            const y = (window.innerHeight - initialHeight) / 2
            setPosition({ x: Math.max(0, x), y: Math.max(0, y) })
        }
    }, [initialWidth, initialHeight])

    const handleMouseDown = (e: React.MouseEvent) => {
        if (isMaximized) return
        setIsDragging(true)
        setDragOffset({
            x: e.clientX - position.x,
            y: e.clientY - position.y,
        })
    }

    const handleMouseMove = (e: React.MouseEvent) => {
        if (isDragging) {
            setPosition({
                x: e.clientX - dragOffset.x,
                y: e.clientY - dragOffset.y,
            })
        }
    }

    const handleMouseUp = () => {
        setIsDragging(false)
    }

    useEffect(() => {
        const handleGlobalMouseMove = (e: MouseEvent) => {
            if (isDragging) {
                setPosition({
                    x: e.clientX - dragOffset.x,
                    y: e.clientY - dragOffset.y,
                })
            }
        }
        const handleGlobalMouseUp = () => {
            setIsDragging(false)
        }

        if (isDragging) {
            window.addEventListener("mousemove", handleGlobalMouseMove)
            window.addEventListener("mouseup", handleGlobalMouseUp)
        }
        return () => {
            window.removeEventListener("mousemove", handleGlobalMouseMove)
            window.removeEventListener("mouseup", handleGlobalMouseUp)
        }
    }, [isDragging, dragOffset])

    const toggleMaximize = () => {
        if (isMaximized) {
            if (preMaximizeState) {
                setPosition({ x: preMaximizeState.x, y: preMaximizeState.y })
                setSize({ width: preMaximizeState.w, height: preMaximizeState.h })
            }
            setIsMaximized(false)
        } else {
            setPreMaximizeState({ x: position.x, y: position.y, w: size.width, h: size.height })
            setPosition({ x: 0, y: 0 })
            setSize({ width: window.innerWidth, height: window.innerHeight })
            setIsMaximized(true)
        }
    }

    if (!mounted) return null

    return createPortal(
        <div
            ref={windowRef}
            className={`fixed bg-background border shadow-2xl rounded-lg flex flex-col overflow-hidden z-[9999] transition-all duration-75 ${isMaximized ? "inset-0 rounded-none border-none" : ""}`}
            style={{
                left: isMaximized ? 0 : position.x,
                top: isMaximized ? 0 : position.y,
                width: isMaximized ? "100%" : size.width,
                height: isMaximized ? "100%" : size.height,
            }}
        >
            {/* Header */}
            <div
                className={`flex items-center justify-between px-4 py-2 bg-muted border-b select-none ${isMaximized ? "cursor-default" : "cursor-move"}`}
                onMouseDown={handleMouseDown}
            >
                <div className="flex items-center gap-2">
                    <GripHorizontal className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-semibold">{title}</span>
                </div>
                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={toggleMaximize}>
                        {isMaximized ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-destructive hover:text-destructive-foreground" onClick={onClose}>
                        <X className="h-3 w-3" />
                    </Button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto bg-black/5 relative p-0">
                {children}
            </div>

            {/* Resize Handle (bottom-right) - Omitting complex resize for now, fixed size is okay per prompt "refine layout" */}
        </div>,
        document.body
    )
}
