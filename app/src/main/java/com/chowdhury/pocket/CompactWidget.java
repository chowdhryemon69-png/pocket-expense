package com.chowdhury.pocket;
import android.appwidget.*;import android.content.*;
public class CompactWidget extends ExpenseWidget {
 @Override public void onUpdate(Context c,AppWidgetManager m,int[] ids){render(c,m,ids,true);}
}
