import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'delete' | 'blue' | 'sage' | 'taupe' | 'cream' | 'cream-outline'
    size?: 'sm' | 'md' | 'lg';
    children: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
    children,
    variant = 'primary',
    size = 'md',
    className,
    disabled,
    ...props
}) => {
    const baseStyles: string = `
    font-semibold rounded-lg focus:outline-none
    focus:ring-2 focus:ring-offset-2 focus:ring-opacity-75
    transition-all duration-150 ease-in-out
    border
    disabled:opacity-60 disabled:cursor-not-allowed
    `;
    let variantStyles: string;
    switch (variant) {
        case 'primary':
            variantStyles = `
            bg-primary text-secondary border-secondary
            hover:bg-secondary hover:text-white
            focus:ring-secondary
            disabled:hover:bg-gray-600 disabled:hover:border-gray-600
            `;
            break;
        case 'secondary':
            variantStyles = `
            bg-secondary text-white 
            hover:bg-primary hover:text-secondary hover:border-secondary
            focus:ring-secondary
            disabled:hover:bg-gray-600 disabled:hover:border-gray-600
            `;
            break;
        case 'danger':
            variantStyles = `
            bg-red-600 text-white border-red-600
            hover:bg-red-700 hover:border-red-700
            focus:ring-red-500
            disabled:hover:bg-red-600 disabled:hover:border-red-600
            `;
            break;
        case 'outline':
            variantStyles = `
            bg-transparent text-secondary border-secondary
            hover:bg-secondary hover:text-white
            focus:ring-secondary
            disabled:hover:bg-transparent disabled:hover:text-blue-600 disabled:text-blue-600/60 disabled:border-blue-600/60 
            `;
            break;
        case 'delete':
            variantStyles = `
            bg-admin-900 text-white
            hover:bg-admin-950 hover:border-admin-950
            focus:ring-admin-500
            disabled:hover:bg-admin-900 disabled:hover:border-admin-900
            `;
            break;
        case 'cream':
            variantStyles = `
            bg-admin-600 text-white border-admin-600
            hover:bg-admin-700 hover:border-admin-700
            focus:ring-admin-500
            disabled:hover:bg-admin-600 disabled:hover:border-admin-600
            `;
            break;
        case 'cream-outline':
            variantStyles = `
            bg-transparent text-admin-800 border-admin-300
            hover:bg-admin-600 hover:border-admin-600 hover:text-white
            focus:ring-admin-500
            disabled:hover:bg-transparent disabled:hover:text-admin-800 disabled:text-admin-800/60 disabled:border-admin-300/60
            `;
            break;
        case 'blue':
            variantStyles = `
            bg-blue-700 text-white border-blue-700
            hover:bg-blue-800 hover:border-blue-800
            focus:ring-blue-500
            disabled:hover:bg-blue-700 disabled:hover:border-blue-700
            `;
            break;
        case 'sage':
            variantStyles = `
            bg-[#87947A] text-white border-[#87947A]
            hover:bg-[#767F6B] hover:border-[#767F6B]
            focus:ring-[#87947A]
            disabled:hover:bg-[#87947A] disabled:hover:border-[#87947A]
            `;
            break;
        case 'taupe':
            variantStyles = `
            bg-[#8B806E] text-white border-[#8B806E]
            hover:bg-[#7A7060] hover:border-[#7A7060]
            focus:ring-[#8B806E]
            disabled:hover:bg-[#8B806E] disabled:hover:border-[#8B806E]
            `;
            break;


        default:
            variantStyles = `
            bg-transparent text-secondary text-bold 
            hover:bg-secondary hover:text-white
            focus:ring-secondary
            `;
    }
    let sizeStyles: string;
    switch (size) {
        case 'sm':
            sizeStyles = 'px-3 py-1.5 text-sm';
            break;
        case 'md':
            sizeStyles = 'px-4 py-2 text-base';
            break;
        case 'lg':
            sizeStyles = 'px-6 py-3 text-lg';
            break;
        default:
            sizeStyles = 'px-4 py-2 text-base';

    }
    const combinedClassName: string = `
    ${baseStyles}
    ${variantStyles}
    ${sizeStyles}
    ${className || ''}
    `.replace(/\s+/g, ' ').trim();
    return (
        <button
            type="button"
            className={combinedClassName}
            disabled={disabled}
            {...props}
        >
            {children}
        </button>
    )
}

export default Button;