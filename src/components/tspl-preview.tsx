"use client";

import React, { useMemo } from 'react';

interface TSPLPreviewProps {
  commands: string;
}

export function TSPLPreview({ commands }: TSPLPreviewProps) {
  const labels = useMemo(() => {
    const lines = commands.split('\n');
    const labelViews: any[] = [];
    let currentLabel: any[] = [];
    let size = { w: 300, h: 200 }; // Default fallback

    lines.forEach(line => {
      const parts = line.trim().split(/\s+/);
      const command = parts[0]?.toUpperCase();

      if (command === 'SIZE') {
        const dimensions = line.split('SIZE')[1].split(',');
        size = { 
          w: parseFloat(dimensions[0]) * 100, // Scale for preview
          h: parseFloat(dimensions[1]) * 100 
        };
      } else if (command === 'CLS') {
        if (currentLabel.length > 0) labelViews.push([...currentLabel]);
        currentLabel = [];
      } else if (command === 'TEXT') {
        // TEXT x,y,"font",rotation,x-multi,y-multi,alignment,"content"
        const textMatch = line.match(/TEXT\s+(\d+),(\d+),"(\d+)",(\d+),(\d+),(\d+),(\d+),"(.*)"/i);
        if (textMatch) {
          currentLabel.push({
            type: 'text',
            x: parseInt(textMatch[1]),
            y: parseInt(textMatch[2]),
            font: textMatch[3],
            align: textMatch[7], // 1=left, 2=center, 3=right
            content: textMatch[8]
          });
        }
      } else if (command === 'BARCODE') {
        // BARCODE x,y,"type",height,readable,rotation,narrow,wide,"content"
        const bcMatch = line.match(/BARCODE\s+(\d+),(\d+),"(.*)",(\d+),(\d+),(\d+),(\d+),(\d+),"(.*)"/i);
        if (bcMatch) {
          currentLabel.push({
            type: 'barcode',
            x: parseInt(bcMatch[1]),
            y: parseInt(bcMatch[2]),
            h: parseInt(bcMatch[4]),
            content: bcMatch[9]
          });
        }
      }
    });

    if (currentLabel.length > 0) labelViews.push(currentLabel);
    return { labelViews, size };
  }, [commands]);

  return (
    <div className="space-y-4 max-h-[400px] overflow-y-auto p-4 bg-slate-950/50 rounded-xl border border-slate-800">
      <div className="flex flex-wrap gap-4 justify-center">
        {labels.labelViews.map((elements, idx) => (
          <div 
            key={idx}
            className="bg-white border border-slate-300 relative overflow-hidden shadow-lg"
            style={{ 
              width: `${labels.size.w}px`, 
              height: `${labels.size.h}px`,
              minWidth: `${labels.size.w}px`
            }}
          >
            {elements.map((el: any, i: number) => {
              if (el.type === 'text') {
                let textAlign: any = 'left';
                let transform = '';
                if (el.align === '2') {
                  textAlign = 'center';
                  transform = 'translateX(-50%)';
                } else if (el.align === '3') {
                  textAlign = 'right';
                  transform = 'translateX(-100%)';
                }

                const fontSize = el.font === '4' ? '18px' : el.font === '3' ? '14px' : '10px';
                const fontWeight = el.font === '4' || el.font === '3' ? 'bold' : 'normal';

                return (
                  <div 
                    key={i}
                    className="absolute text-black leading-none whitespace-nowrap"
                    style={{ 
                      left: `${el.x}px`, 
                      top: `${el.y}px`,
                      textAlign,
                      transform,
                      fontSize,
                      fontWeight,
                      fontFamily: 'monospace'
                    }}
                  >
                    {el.content}
                  </div>
                );
              }
              if (el.type === 'barcode') {
                return (
                  <div 
                    key={i}
                    className="absolute bg-black flex items-center justify-center text-[8px] text-white overflow-hidden"
                    style={{ 
                      left: `${el.x}px`, 
                      top: `${el.y}px`,
                      width: '140px', // Simplified barcode preview
                      height: `${el.h}px`,
                    }}
                  >
                    ||||||||||||||||||||||||
                  </div>
                );
              }
              return null;
            })}
          </div>
        ))}
      </div>
      <p className="text-center text-[10px] text-slate-500 uppercase tracking-widest font-bold">
        TSPL Visual Preview (Live)
      </p>
    </div>
  );
}
