import { useEffect, useRef } from "react";

/**
 * Sets Document Title and on Page unloads resets title to old/current
 */
const useDocumentTitle = ({
    title,
    defaultTitle
}: {
    title: string;
    defaultTitle?: string;
}) => {

    const currentTitle = useRef<string>(defaultTitle ?? `App`)

    useEffect(() => {
        currentTitle.current = window.document.title || defaultTitle || `App`
        window.document.title = title
        return () => {
            window.document.title = currentTitle.current
        }
    }, [])
}

export default useDocumentTitle